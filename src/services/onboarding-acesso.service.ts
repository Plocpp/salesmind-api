import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../database/prisma";
import { validatePasswordStrength } from "../utils/password-policy";
import emailService from "./email.service";

const TABELA_PRE_CADASTRO = "saas_pre_cadastro";
const TABELA_CODIGO_ACESSO = "saas_codigo_acesso";
const TABELA_CODIGO_AUDITORIA = "saas_codigo_acesso_auditoria";

type TipoCodigoAcesso = "ATIVACAO_PRIMEIRO_ACESSO" | "RECUPERACAO_SENHA";
const ACCESS_CODE_REGEX = /^\d{6}$/;

const ACCESS_CODE_MAX_ATTEMPTS = Number(process.env.ACCESS_CODE_MAX_ATTEMPTS || 5);
const ACCESS_CODE_LOCK_MINUTES = Number(process.env.ACCESS_CODE_LOCK_MINUTES || 15);
const ACCESS_CODE_RESEND_COOLDOWN_SECONDS = Number(process.env.ACCESS_CODE_RESEND_COOLDOWN_SECONDS || 30);
const ACCESS_CODE_MAX_SENDS_PER_HOUR = Number(process.env.ACCESS_CODE_MAX_SENDS_PER_HOUR || 6);

class OnboardingAcessoService {
  private _tablesReady = false;

  async init() {
    await this.ensureTables();
  }

  private async ensureTables() {
    if (this._tablesReady) return;
    this._tablesReady = true;
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${TABELA_CODIGO_ACESSO} (
        id VARCHAR(191) PRIMARY KEY,
        pre_cadastro_id VARCHAR(191) NULL,
        usuario_id VARCHAR(191) NULL,
        email VARCHAR(191) NOT NULL,
        tipo VARCHAR(60) NOT NULL,
        codigo_hash VARCHAR(191) NOT NULL,
        expira_em DATETIME(3) NOT NULL,
        usado_em DATETIME(3) NULL,
        tentativas INT NOT NULL DEFAULT 0,
        bloqueado_ate DATETIME(3) NULL,
        janela_envio_inicio DATETIME(3) NULL,
        janela_envio_count INT NOT NULL DEFAULT 1,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        INDEX idx_codigo_email_tipo (email, tipo),
        INDEX idx_codigo_expira (expira_em),
        INDEX idx_codigo_pre_cadastro (pre_cadastro_id)
      )
    `);

    const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
      `,
      TABELA_CODIGO_ACESSO
    );

    const existing = new Set(columns.map((item) => String(item.column_name || "").toLowerCase()));

    if (!existing.has("bloqueado_ate")) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE ${TABELA_CODIGO_ACESSO} ADD COLUMN bloqueado_ate DATETIME(3) NULL`
      );
    }

    if (!existing.has("janela_envio_inicio")) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE ${TABELA_CODIGO_ACESSO} ADD COLUMN janela_envio_inicio DATETIME(3) NULL`
      );
    }

    if (!existing.has("janela_envio_count")) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE ${TABELA_CODIGO_ACESSO} ADD COLUMN janela_envio_count INT NOT NULL DEFAULT 1`
      );
    }

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${TABELA_CODIGO_AUDITORIA} (
        id VARCHAR(191) PRIMARY KEY,
        email VARCHAR(191) NOT NULL,
        tipo VARCHAR(60) NOT NULL,
        evento VARCHAR(80) NOT NULL,
        pre_cadastro_id VARCHAR(191) NULL,
        usuario_id VARCHAR(191) NULL,
        detalhes_json JSON NULL,
        created_at DATETIME(3) NOT NULL,
        INDEX idx_codigo_auditoria_email_tipo_data (email, tipo, created_at),
        INDEX idx_codigo_auditoria_evento_data (evento, created_at)
      )
    `);
  }

  private async registrarAuditoriaCodigo(input: {
    email: string;
    tipo: TipoCodigoAcesso;
    evento: string;
    preCadastroId?: string | null;
    usuarioId?: string | null;
    detalhes?: Record<string, unknown>;
  }) {
    try {
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO ${TABELA_CODIGO_AUDITORIA}
        (id, email, tipo, evento, pre_cadastro_id, usuario_id, detalhes_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        crypto.randomUUID(),
        this.normalizeEmail(input.email),
        input.tipo,
        input.evento,
        input.preCadastroId || null,
        input.usuarioId || null,
        JSON.stringify(input.detalhes || {}),
        new Date()
      );
    } catch {
      // Auditoria nao deve quebrar o fluxo principal.
    }
  }

  private normalizeEmail(value: string) {
    return String(value || "").trim().toLowerCase();
  }

  private gerarCodigoNumerico() {
    return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  }

  private hashCodigo(codigo: string) {
    const pepper = process.env.ACCESS_CODE_HASH_PEPPER || process.env.JWT_ACCESS_SECRET || "salesmind-access-code-pepper";
    return crypto.createHmac("sha256", pepper).update(String(codigo || "")).digest("hex");
  }

  private minutosExpiracao() {
    const parsed = Number(process.env.ACCESS_CODE_TTL_MINUTES || 20);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
  }

  private permitirCodigoNoResponse() {
    return String(process.env.EMAIL_DEV_RETURN_CODE || "false").toLowerCase() === "true";
  }

  private async gerarCodigoPorEmail(input: {
    email: string;
    tipo: TipoCodigoAcesso;
    preCadastroId?: string;
    usuarioId?: string;
  }) {
    await this.ensureTables();

    const email = this.normalizeEmail(input.email);
    if (!email) throw new Error("email_obrigatorio");

    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + this.minutosExpiracao() * 60 * 1000);
    const codigo = this.gerarCodigoNumerico();

    const ativoRows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT id, created_at, janela_envio_inicio, janela_envio_count
      FROM ${TABELA_CODIGO_ACESSO}
      WHERE email = ?
        AND tipo = ?
        AND usado_em IS NULL
        AND expira_em > ?
      ORDER BY created_at DESC
      LIMIT 1
      `,
      email,
      input.tipo,
      agora
    );

    const codigoAtivo = ativoRows[0] || null;
    if (codigoAtivo?.created_at) {
      const elapsed = agora.getTime() - new Date(codigoAtivo.created_at).getTime();
      if (elapsed < ACCESS_CODE_RESEND_COOLDOWN_SECONDS * 1000) {
        await this.registrarAuditoriaCodigo({
          email,
          tipo: input.tipo,
          evento: "CODIGO_REENVIO_BLOQUEADO_COOLDOWN",
          preCadastroId: input.preCadastroId,
          usuarioId: input.usuarioId,
          detalhes: { elapsedMs: elapsed, cooldownSeconds: ACCESS_CODE_RESEND_COOLDOWN_SECONDS },
        });
        throw new Error("codigo_reenvio_aguardar");
      }
    }

    let janelaInicio = agora;
    let janelaCount = 1;
    if (codigoAtivo?.janela_envio_inicio) {
      const inicio = new Date(codigoAtivo.janela_envio_inicio);
      const withinWindow = agora.getTime() - inicio.getTime() < 60 * 60 * 1000;
      if (withinWindow) {
        const baseCount = Number(codigoAtivo.janela_envio_count || 1);
        if (baseCount >= ACCESS_CODE_MAX_SENDS_PER_HOUR) {
          await this.registrarAuditoriaCodigo({
            email,
            tipo: input.tipo,
            evento: "CODIGO_REENVIO_BLOQUEADO_JANELA",
            preCadastroId: input.preCadastroId,
            usuarioId: input.usuarioId,
            detalhes: { sendsInWindow: baseCount, maxSendsPerHour: ACCESS_CODE_MAX_SENDS_PER_HOUR },
          });
          throw new Error("codigo_limite_envio_excedido");
        }
        janelaInicio = inicio;
        janelaCount = baseCount + 1;
      }
    }

    await prisma.$executeRawUnsafe(
      `
      UPDATE ${TABELA_CODIGO_ACESSO}
      SET usado_em = ?, updated_at = ?
      WHERE email = ? AND tipo = ? AND usado_em IS NULL
      `,
      agora,
      agora,
      email,
      input.tipo
    );

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO ${TABELA_CODIGO_ACESSO}
      (id, pre_cadastro_id, usuario_id, email, tipo, codigo_hash, expira_em, usado_em, tentativas, bloqueado_ate, janela_envio_inicio, janela_envio_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, NULL, ?, ?, ?, ?)
      `,
      crypto.randomUUID(),
      input.preCadastroId || null,
      input.usuarioId || null,
      email,
      input.tipo,
      this.hashCodigo(codigo),
      expiraEm,
      janelaInicio,
      janelaCount,
      agora,
      agora
    );

    await this.registrarAuditoriaCodigo({
      email,
      tipo: input.tipo,
      evento: "CODIGO_GERADO",
      preCadastroId: input.preCadastroId,
      usuarioId: input.usuarioId,
      detalhes: {
        expiraEm: expiraEm.toISOString(),
        janelaEnvioCount: janelaCount,
      },
    });

    return {
      codigo,
      expiraEm,
    };
  }

  private async validarCodigo(input: {
    email: string;
    codigo: string;
    tipo: TipoCodigoAcesso;
  }) {
    await this.ensureTables();

    const email = this.normalizeEmail(input.email);
    const codigo = String(input.codigo || "").trim();

    if (!ACCESS_CODE_REGEX.test(codigo)) {
      await this.registrarAuditoriaCodigo({
        email,
        tipo: input.tipo,
        evento: "CODIGO_FORMATO_INVALIDO",
      });
      throw new Error("codigo_invalido");
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT id, pre_cadastro_id, usuario_id, codigo_hash, expira_em, tentativas, bloqueado_ate
      FROM ${TABELA_CODIGO_ACESSO}
      WHERE email = ?
        AND tipo = ?
        AND usado_em IS NULL
      ORDER BY created_at DESC
      LIMIT 1
      `,
      email,
      input.tipo
    );

    if (!rows.length) {
      await this.registrarAuditoriaCodigo({
        email,
        tipo: input.tipo,
        evento: "CODIGO_NAO_ENCONTRADO",
      });
      throw new Error("codigo_nao_encontrado");
    }

    const row = rows[0];
    const agora = new Date();

    if (row.bloqueado_ate && new Date(row.bloqueado_ate).getTime() > agora.getTime()) {
      await this.registrarAuditoriaCodigo({
        email,
        tipo: input.tipo,
        evento: "CODIGO_BLOQUEADO_TENTATIVAS",
        preCadastroId: row.pre_cadastro_id,
        usuarioId: row.usuario_id,
      });
      throw new Error("codigo_bloqueado_por_tentativas");
    }

    if (new Date(row.expira_em).getTime() < agora.getTime()) {
      await this.registrarAuditoriaCodigo({
        email,
        tipo: input.tipo,
        evento: "CODIGO_EXPIRADO",
        preCadastroId: row.pre_cadastro_id,
        usuarioId: row.usuario_id,
      });
      throw new Error("codigo_expirado");
    }

    if (Number(row.tentativas || 0) >= ACCESS_CODE_MAX_ATTEMPTS) {
      await this.registrarAuditoriaCodigo({
        email,
        tipo: input.tipo,
        evento: "CODIGO_BLOQUEADO_LIMITE_TENTATIVAS",
        preCadastroId: row.pre_cadastro_id,
        usuarioId: row.usuario_id,
      });
      throw new Error("codigo_bloqueado_por_tentativas");
    }

    const hash = this.hashCodigo(codigo);
    if (hash !== row.codigo_hash) {
      const tentativas = Number(row.tentativas || 0) + 1;
      const bloqueadoAte = tentativas >= ACCESS_CODE_MAX_ATTEMPTS
        ? new Date(agora.getTime() + ACCESS_CODE_LOCK_MINUTES * 60 * 1000)
        : null;

      await prisma.$executeRawUnsafe(
        `
        UPDATE ${TABELA_CODIGO_ACESSO}
        SET tentativas = tentativas + 1,
            bloqueado_ate = ?,
            updated_at = ?
        WHERE id = ?
        `,
        bloqueadoAte,
        agora,
        row.id
      );

      await this.registrarAuditoriaCodigo({
        email,
        tipo: input.tipo,
        evento: "CODIGO_INVALIDO_TENTATIVA",
        preCadastroId: row.pre_cadastro_id,
        usuarioId: row.usuario_id,
        detalhes: { tentativasAposFalha: tentativas },
      });
      throw new Error("codigo_invalido");
    }

    await prisma.$executeRawUnsafe(
      `
      UPDATE ${TABELA_CODIGO_ACESSO}
      SET usado_em = ?, updated_at = ?
      WHERE id = ?
      `,
      agora,
      agora,
      row.id
    );

    await this.registrarAuditoriaCodigo({
      email,
      tipo: input.tipo,
      evento: "CODIGO_VALIDADO_SUCESSO",
      preCadastroId: row.pre_cadastro_id,
      usuarioId: row.usuario_id,
    });

    return {
      preCadastroId: row.pre_cadastro_id as string | null,
      usuarioId: row.usuario_id as string | null,
      email,
    };
  }

  async enviarCodigoAtivacao(input: {
    preCadastroId: string;
    email: string;
    empresaNome?: string;
    usuarioId?: string;
  }) {
    const generated = await this.gerarCodigoPorEmail({
      email: input.email,
      tipo: "ATIVACAO_PRIMEIRO_ACESSO",
      preCadastroId: input.preCadastroId,
      usuarioId: input.usuarioId,
    });

    await emailService.send({
      to: input.email,
      subject: "Seu código de ativação - SalesMind",
      text: `Seu código de ativação é ${generated.codigo}. Ele expira em ${this.minutosExpiracao()} minutos.`,
      html: `<p>Olá!</p><p>Seu código de ativação é:</p><h2>${generated.codigo}</h2><p>Ele expira em ${this.minutosExpiracao()} minutos.</p><p>Empresa: ${input.empresaNome || "SalesMind"}</p>`,
    });

    return {
      ok: true,
      via: "email",
      expiraEm: generated.expiraEm,
      ...(this.permitirCodigoNoResponse() ? { codigo: generated.codigo } : {}),
    };
  }

  async confirmarCodigoAtivacao(input: { email: string; codigo: string }) {
    const validated = await this.validarCodigo({
      email: input.email,
      codigo: input.codigo,
      tipo: "ATIVACAO_PRIMEIRO_ACESSO",
    });

    if (!validated.preCadastroId) {
      throw new Error("pre_cadastro_codigo_nao_encontrado");
    }

    const now = new Date();
    await prisma.$executeRawUnsafe(
      `
      UPDATE ${TABELA_PRE_CADASTRO}
      SET status = 'ATIVO', ativado_em = ?, updated_at = ?
      WHERE id = ?
      `,
      now,
      now,
      validated.preCadastroId
    );

    return {
      ok: true,
      status: "ATIVO",
      preCadastroId: validated.preCadastroId,
    };
  }

  async validarLoginPermitido(emailInput: string) {
    const email = this.normalizeEmail(emailInput);
    if (!email) return;

    let rows: any[] = [];
    try {
      rows = await prisma.$queryRawUnsafe<any[]>(
        `
        SELECT id, status
        FROM ${TABELA_PRE_CADASTRO}
        WHERE admin_email = ?
        ORDER BY created_at DESC
        LIMIT 1
        `,
        email
      );
    } catch {
      return;
    }

    if (!rows.length) return;

    const status = String(rows[0].status || "");
    if (status === "AGUARDANDO_ATIVACAO") {
      throw new Error("ativacao_email_pendente");
    }
  }

  async solicitarRecuperacaoSenha(emailInput: string) {
    const email = this.normalizeEmail(emailInput);
    if (!email) throw new Error("email_obrigatorio");

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      return { ok: true, message: "Se o e-mail existir, enviaremos um código." };
    }

    const generated = await this.gerarCodigoPorEmail({
      email,
      tipo: "RECUPERACAO_SENHA",
      usuarioId: usuario.id,
    });

    await emailService.send({
      to: email,
      subject: "Código para recuperação de senha - SalesMind",
      text: `Seu código para recuperação de senha é ${generated.codigo}. Ele expira em ${this.minutosExpiracao()} minutos.`,
      html: `<p>Recebemos uma solicitação de recuperação de senha.</p><p>Seu código é:</p><h2>${generated.codigo}</h2><p>Validade: ${this.minutosExpiracao()} minutos.</p>`,
    });

    return {
      ok: true,
      message: "Se o e-mail existir, enviaremos um código.",
      ...(this.permitirCodigoNoResponse() ? { codigo: generated.codigo } : {}),
    };
  }

  async redefinirSenhaComCodigo(input: { email: string; codigo: string; novaSenha: string }) {
    if (!String(input.novaSenha || "").trim()) throw new Error("nova_senha_obrigatoria");

    const passwordValidation = validatePasswordStrength(input.novaSenha);
    if (!passwordValidation.ok) throw new Error(passwordValidation.message || "senha_invalida");

    const validated = await this.validarCodigo({
      email: input.email,
      codigo: input.codigo,
      tipo: "RECUPERACAO_SENHA",
    });

    let usuarioId = validated.usuarioId;

    if (!usuarioId) {
      const usuario = await prisma.usuario.findUnique({ where: { email: validated.email } });
      if (!usuario) throw new Error("usuario_nao_encontrado");
      usuarioId = usuario.id;
    }

    const novaSenhaHash = await bcrypt.hash(input.novaSenha, 10);

    await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        senha: novaSenhaHash,
        refreshToken: null,
      },
    });

    return {
      ok: true,
      message: "Senha redefinida com sucesso",
    };
  }
}

const onboardingAcessoService = new OnboardingAcessoService();

export default onboardingAcessoService;
