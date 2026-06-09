import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import { z } from 'zod';
import prisma from '../database/prisma';
import { CadastrosAuxiliaresService } from './cadastros-auxiliares.service';
import comunicacaoCodigoService from './comunicacao-codigo.service';

const cadastrosAuxiliaresService = new CadastrosAuxiliaresService();

type EntregadorContato = {
  id: string;
  nome: string;
  ativo: boolean;
  telefone?: string | null;
  email?: string | null;
};

const criarDispositivoSchema = z.object({
  entregadorId: z.string().min(1),
  nomeDispositivo: z.string().max(120).optional(),
  plataforma: z.enum(['ANDROID', 'IOS', 'OUTRO']).default('OUTRO'),
  deviceId: z.string().max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const gerarCodigoAtivacaoSchema = z.object({
  entregadorId: z.string().min(1),
  nomeDispositivo: z.string().max(120).optional(),
  plataforma: z.enum(['ANDROID', 'IOS', 'OUTRO']).default('ANDROID'),
  deviceId: z.string().max(120).optional(),
  validadeMinutos: z.number().int().min(5).max(1440).optional(),
});

const ativarDispositivoSchema = z.object({
  codigo: z.string().regex(/^\d{6}$/),
  nomeDispositivo: z.string().max(120).optional(),
  plataforma: z.enum(['ANDROID', 'IOS', 'OUTRO']).default('ANDROID'),
  deviceId: z.string().max(120).optional(),
});

const iniciarSessaoSchema = z.object({
  vendaId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  iniciadaEm: z.coerce.date().optional(),
});

const pontoSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  precisao: z.number().nonnegative().optional(),
  velocidade: z.number().nonnegative().optional(),
  direcao: z.number().min(0).max(360).optional(),
  bateria: z.number().int().min(0).max(100).optional(),
  fonte: z.string().max(40).optional(),
  registradoEm: z.coerce.date().optional(),
  raw: z.record(z.string(), z.unknown()).optional(),
});

const finalizarSessaoSchema = z.object({
  motivo: z.string().max(255).optional(),
  finalizadaEm: z.coerce.date().optional(),
});

const MAX_FUTURO_MS = 5 * 60 * 1000;
const MAX_PASSADO_MS = 7 * 24 * 60 * 60 * 1000;
const STALE_MINUTES_DEFAULT = 5;
const ACTIVATION_CODE_MINUTES_DEFAULT = 30;
const ACTIVATION_CODE_MAX_ATTEMPTS = Number(process.env.RASTREIO_ACTIVATION_MAX_ATTEMPTS || 5);
const ACTIVATION_CODE_LOCK_MINUTES = Number(process.env.RASTREIO_ACTIVATION_LOCK_MINUTES || 15);
const ACTIVATION_CODE_RESEND_COOLDOWN_SECONDS = Number(process.env.RASTREIO_ACTIVATION_RESEND_COOLDOWN_SECONDS || 30);
const TABELA_ATIVACAO_AUDITORIA = 'rastreio_ativacao_mobile_auditoria';

const lerRawJson = (raw: unknown) => {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return null;
};

export class RastreioTransporteService {
  private schemaReady = false;
  private entregadorTableName: string | null | undefined = undefined;

  private getEntregadorDelegate() {
    return (prisma as any)?.entregador;
  }

  private async resolveEntregadorTableName() {
    if (this.entregadorTableName !== undefined) return this.entregadorTableName;

    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) IN ('entregador', 'entregadores')
      ORDER BY CASE
        WHEN LOWER(table_name) = 'entregador' THEN 0
        WHEN LOWER(table_name) = 'entregadores' THEN 1
        ELSE 2
      END
      LIMIT 1
      `,
    );

    const tableName = rows[0]?.table_name ? String(rows[0].table_name) : null;
    this.entregadorTableName = /^[a-zA-Z0-9_]+$/.test(tableName || '') ? tableName : null;
    return this.entregadorTableName;
  }

  private tokenHash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private gerarToken() {
    return `trk_${randomBytes(24).toString('hex')}`;
  }

  private gerarCodigoAtivacao() {
    return String(randomInt(0, 1000000)).padStart(6, '0');
  }

  private hashCodigoAtivacao(codigo: string) {
    const pepper = process.env.RASTREIO_ACTIVATION_HASH_PEPPER || process.env.JWT_ACCESS_SECRET || 'salesmind-rastreio-activation-pepper';
    return createHash('sha256').update(`${pepper}:${String(codigo || '').trim()}`).digest('hex');
  }

  private async registrarTentativaInvalidaAtivacao(activationId: string, tentativasAtuais: number) {
    const agora = new Date();
    const tentativas = tentativasAtuais + 1;
    const bloqueadoAte = tentativas >= ACTIVATION_CODE_MAX_ATTEMPTS
      ? new Date(agora.getTime() + ACTIVATION_CODE_LOCK_MINUTES * 60 * 1000)
      : null;

    await prisma.$executeRawUnsafe(
      `
      UPDATE rastreio_ativacao_mobile
      SET tentativas = ?, blocked_until = ?
      WHERE id = ?
      `,
      tentativas,
      bloqueadoAte,
      activationId,
    );
  }

  private async registrarAuditoriaAtivacao(input: {
    evento: string;
    activationId?: string | null;
    entregadorId?: string | null;
    deviceId?: string | null;
    detalhes?: Record<string, unknown>;
  }) {
    try {
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO ${TABELA_ATIVACAO_AUDITORIA}
        (id, activation_id, entregador_id, device_id, evento, detalhes_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        randomUUID(),
        input.activationId || null,
        input.entregadorId || null,
        input.deviceId || null,
        input.evento,
        JSON.stringify(input.detalhes || {}),
        new Date(),
      );
    } catch {
      // Auditoria nao deve bloquear o fluxo principal.
    }
  }

  private async createDeviceRecord(input: {
    entregadorId: string;
    nomeDispositivo?: string;
    plataforma: 'ANDROID' | 'IOS' | 'OUTRO';
    deviceId?: string;
    metadata?: Record<string, unknown>;
    userId?: string | null;
  }) {
    const id = randomUUID();
    const token = this.gerarToken();
    const hash = this.tokenHash(token);

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO rastreio_dispositivo (
        id, entregador_id, nome_dispositivo, plataforma, device_id, token_hash, ativo, metadata, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `,
      id,
      input.entregadorId,
      input.nomeDispositivo || null,
      input.plataforma,
      input.deviceId || null,
      hash,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.userId || null,
    );

    return {
      id,
      token,
      entregadorId: input.entregadorId,
      plataforma: input.plataforma,
      nomeDispositivo: input.nomeDispositivo || null,
      deviceId: input.deviceId || null,
      observacao: 'Guarde este token com seguranca. Ele nao sera exibido novamente.',
    };
  }

  private async ensureSchema() {
    if (this.schemaReady) return;

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS rastreio_dispositivo (
        id VARCHAR(36) PRIMARY KEY,
        entregador_id VARCHAR(191) NOT NULL,
        nome_dispositivo VARCHAR(120) NULL,
        plataforma VARCHAR(40) NOT NULL,
        device_id VARCHAR(120) NULL,
        token_hash CHAR(64) NOT NULL UNIQUE,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        ultimo_ping_em DATETIME(3) NULL,
        metadata JSON NULL,
        created_by_user_id VARCHAR(191) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_rastreio_dispositivo_entregador (entregador_id, ativo),
        INDEX idx_rastreio_dispositivo_device (device_id)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS rastreio_sessao (
        id VARCHAR(36) PRIMARY KEY,
        entregador_id VARCHAR(191) NOT NULL,
        dispositivo_id VARCHAR(36) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
        venda_id VARCHAR(191) NULL,
        iniciada_em DATETIME(3) NOT NULL,
        finalizada_em DATETIME(3) NULL,
        motivo VARCHAR(255) NULL,
        metadata JSON NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_rastreio_sessao_status (status, iniciada_em),
        INDEX idx_rastreio_sessao_entregador (entregador_id, status),
        INDEX idx_rastreio_sessao_dispositivo (dispositivo_id)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS rastreio_ponto (
        id VARCHAR(36) PRIMARY KEY,
        sessao_id VARCHAR(36) NOT NULL,
        latitude DECIMAL(10,7) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        precisao FLOAT NULL,
        velocidade FLOAT NULL,
        direcao FLOAT NULL,
        bateria INT NULL,
        fonte VARCHAR(40) NULL,
        registrado_em DATETIME(3) NOT NULL,
        raw JSON NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_rastreio_ponto_sessao (sessao_id, registrado_em)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS rastreio_ativacao_mobile (
        id VARCHAR(36) PRIMARY KEY,
        codigo VARCHAR(12) NULL,
        codigo_hash CHAR(64) NULL,
        entregador_id VARCHAR(191) NOT NULL,
        nome_dispositivo VARCHAR(120) NULL,
        plataforma VARCHAR(40) NOT NULL,
        device_id VARCHAR(120) NULL,
        metadata JSON NULL,
        expires_at DATETIME(3) NOT NULL,
        used_at DATETIME(3) NULL,
        tentativas INT NOT NULL DEFAULT 0,
        blocked_until DATETIME(3) NULL,
        created_by_user_id VARCHAR(191) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_rastreio_ativacao_entregador (entregador_id, expires_at),
        INDEX idx_rastreio_ativacao_codigo (codigo, used_at),
        INDEX idx_rastreio_ativacao_codigo_hash (codigo_hash, used_at)
      )
    `);

    const activationColumns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'rastreio_ativacao_mobile'
      `,
    );
    const activationExisting = new Set(activationColumns.map((item) => String(item.column_name || '').toLowerCase()));

    if (!activationExisting.has('codigo_hash')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE rastreio_ativacao_mobile ADD COLUMN codigo_hash CHAR(64) NULL`);
      await prisma.$executeRawUnsafe(`CREATE INDEX idx_rastreio_ativacao_codigo_hash ON rastreio_ativacao_mobile (codigo_hash, used_at)`);
    }

    if (!activationExisting.has('tentativas')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE rastreio_ativacao_mobile ADD COLUMN tentativas INT NOT NULL DEFAULT 0`);
    }

    if (!activationExisting.has('blocked_until')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE rastreio_ativacao_mobile ADD COLUMN blocked_until DATETIME(3) NULL`);
    }

    await prisma.$executeRawUnsafe(
      `
      UPDATE rastreio_ativacao_mobile
      SET codigo_hash = SHA2(CONCAT(?, ':', codigo), 256)
      WHERE codigo_hash IS NULL
        AND codigo IS NOT NULL
      `,
      process.env.RASTREIO_ACTIVATION_HASH_PEPPER || process.env.JWT_ACCESS_SECRET || 'salesmind-rastreio-activation-pepper',
    );

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${TABELA_ATIVACAO_AUDITORIA} (
        id VARCHAR(36) PRIMARY KEY,
        activation_id VARCHAR(36) NULL,
        entregador_id VARCHAR(191) NULL,
        device_id VARCHAR(120) NULL,
        evento VARCHAR(80) NOT NULL,
        detalhes_json JSON NULL,
        created_at DATETIME(3) NOT NULL,
        INDEX idx_ativacao_auditoria_activation_data (activation_id, created_at),
        INDEX idx_ativacao_auditoria_entregador_data (entregador_id, created_at),
        INDEX idx_ativacao_auditoria_evento_data (evento, created_at)
      )
    `);

    this.schemaReady = true;
  }

  private async validarEntregador(entregadorId: string): Promise<EntregadorContato> {
    const delegate = this.getEntregadorDelegate();
    let entregador: EntregadorContato | null = null;

    if (delegate?.findUnique) {
      entregador = await delegate.findUnique({
        where: { id: entregadorId },
        select: { id: true, nome: true, ativo: true, telefone: true, email: true },
      });
    }

    if (!entregador) {
      const fallbackList = await cadastrosAuxiliaresService.listarEntregadores();
      const fallbackMatch = (fallbackList || []).find((item: any) => item?.id === entregadorId);
      if (fallbackMatch) {
        entregador = {
          id: String(fallbackMatch.id),
          nome: String(fallbackMatch.nome || ''),
          ativo: Boolean(fallbackMatch.ativo),
          telefone: fallbackMatch.telefone || null,
          email: fallbackMatch.email || null,
        };
      }
    }

    if (!entregador) {
      const entregadorTable = await this.resolveEntregadorTableName();
      if (!entregadorTable) {
        entregador = null;
      } else {
      const rows = await prisma.$queryRawUnsafe<Array<any>>(
        `
        SELECT id, nome, ativo, telefone, email
        FROM ${entregadorTable}
        WHERE id = ?
        LIMIT 1
        `,
        entregadorId,
      );

      if (rows[0]) {
        entregador = {
          id: rows[0].id,
          nome: rows[0].nome,
          ativo: Boolean(rows[0].ativo),
          telefone: rows[0].telefone || null,
          email: rows[0].email || null,
        };
      }
      }
    }

    if (!entregador) throw new Error('Entregador nao encontrado.');
    if (!entregador.ativo) throw new Error('Entregador esta inativo para rastreio.');

    return entregador;
  }

  private async enviarCodigoAtivacaoParaEntregador(entregador: EntregadorContato, codigo: string) {
    if (!entregador.telefone) return null;

    try {
      const results = await comunicacaoCodigoService.enviarCodigo({
        telefone: String(entregador.telefone),
        codigo,
        finalidade: 'ATIVACAO',
        canaisPreferidos: ['sms', 'whatsapp'],
      });

      await this.registrarAuditoriaAtivacao({
        evento: 'CODIGO_ATIVACAO_ENVIADO_TELEFONE',
        entregadorId: entregador.id,
        detalhes: { results },
      });

      return results;
    } catch (error: any) {
      await this.registrarAuditoriaAtivacao({
        evento: 'CODIGO_ATIVACAO_FALHA_ENVIO_TELEFONE',
        entregadorId: entregador.id,
        detalhes: { error: error?.message || String(error) },
      });
      throw new Error(error?.message || 'falha_envio_codigo_telefone');
    }
  }

  private async autenticarDispositivo(token?: string | null) {
    if (!token) throw new Error('Token de rastreio nao informado.');

    await this.ensureSchema();

    const hash = this.tokenHash(token);
    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT id, entregador_id, ativo
      FROM rastreio_dispositivo
      WHERE token_hash = ?
      LIMIT 1
      `,
      hash,
    );

    const dispositivo = rows[0];
    if (!dispositivo) throw new Error('Token de rastreio invalido.');
    if (!dispositivo.ativo) throw new Error('Dispositivo revogado para rastreio.');

    return dispositivo;
  }

  async listarEntregadores() {
    const delegate = this.getEntregadorDelegate();

    if (delegate?.findMany) {
      const entregadores = await delegate.findMany({
        select: { id: true, nome: true, ativo: true, telefone: true, email: true },
        orderBy: { nome: 'asc' },
        take: 300,
      });

      if (Array.isArray(entregadores) && entregadores.length > 0) {
        return entregadores;
      }
    }

    const entregadorTable = await this.resolveEntregadorTableName();
    if (!entregadorTable) return [];

    const rows = await prisma.$queryRawUnsafe<Array<any>>(`
      SELECT id, nome, ativo, telefone, email
      FROM ${entregadorTable}
      ORDER BY nome ASC
      LIMIT 300
    `);

    return rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      ativo: Boolean(row.ativo),
      telefone: row.telefone || null,
      email: row.email || null,
    }));
  }

  async criarDispositivo(data: unknown, userId: string) {
    await this.ensureSchema();
    const payload = criarDispositivoSchema.parse(data);
    await this.validarEntregador(payload.entregadorId);

    return this.createDeviceRecord({
      entregadorId: payload.entregadorId,
      nomeDispositivo: payload.nomeDispositivo,
      plataforma: payload.plataforma,
      deviceId: payload.deviceId,
      metadata: payload.metadata,
      userId,
    });
  }

  async gerarCodigoAtivacaoDispositivo(data: unknown, userId: string) {
    await this.ensureSchema();
    const payload = gerarCodigoAtivacaoSchema.parse(data);
    await this.validarEntregador(payload.entregadorId);

    const codigoAtivoRows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT created_at
      FROM rastreio_ativacao_mobile
      WHERE entregador_id = ?
        AND used_at IS NULL
        AND expires_at > NOW(3)
      ORDER BY created_at DESC
      LIMIT 1
      `,
      payload.entregadorId,
    );

    if (codigoAtivoRows[0]?.created_at) {
      const elapsed = Date.now() - new Date(codigoAtivoRows[0].created_at).getTime();
      if (elapsed < ACTIVATION_CODE_RESEND_COOLDOWN_SECONDS * 1000) {
        await this.registrarAuditoriaAtivacao({
          evento: 'CODIGO_ATIVACAO_REENVIO_BLOQUEADO_COOLDOWN',
          entregadorId: payload.entregadorId,
          deviceId: payload.deviceId || null,
          detalhes: { elapsedMs: elapsed, cooldownSeconds: ACTIVATION_CODE_RESEND_COOLDOWN_SECONDS },
        });
        throw new Error('codigo_ativacao_reenvio_aguardar');
      }
    }

    await prisma.$executeRawUnsafe(
      `
      UPDATE rastreio_ativacao_mobile
      SET used_at = COALESCE(used_at, NOW(3))
      WHERE entregador_id = ?
        AND used_at IS NULL
        AND expires_at > NOW(3)
      `,
      payload.entregadorId,
    );

    const codigo = this.gerarCodigoAtivacao();
    const codigoHash = this.hashCodigoAtivacao(codigo);
    const expiresAt = new Date(Date.now() + (payload.validadeMinutos || ACTIVATION_CODE_MINUTES_DEFAULT) * 60 * 1000);

    const entregador = await this.validarEntregador(payload.entregadorId);

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO rastreio_ativacao_mobile (
        id, codigo, codigo_hash, entregador_id, nome_dispositivo, plataforma, device_id, metadata, expires_at, tentativas, blocked_until, created_by_user_id
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)
      `,
      randomUUID(),
      codigoHash,
      payload.entregadorId,
      payload.nomeDispositivo || null,
      payload.plataforma,
      payload.deviceId || null,
      null,
      expiresAt,
      userId,
    );

    await this.registrarAuditoriaAtivacao({
      evento: 'CODIGO_ATIVACAO_GERADO',
      entregadorId: payload.entregadorId,
      deviceId: payload.deviceId || null,
      detalhes: {
        plataforma: payload.plataforma,
        expiraEm: expiresAt.toISOString(),
      },
    });

    if (entregador.telefone) {
      await this.enviarCodigoAtivacaoParaEntregador(entregador, codigo);
    }

    const response: any = {
      entregadorId: payload.entregadorId,
      plataforma: payload.plataforma,
      nomeDispositivo: payload.nomeDispositivo || null,
      deviceId: payload.deviceId || null,
      expiraEm: expiresAt.toISOString(),
      instrucoes: 'Informe este codigo no app mobile do entregador para ativar o aparelho sem copiar token manualmente.',
    };

    if (String(process.env.PHONE_DEV_RETURN_CODE || 'false').toLowerCase() === 'true' || !entregador.telefone) {
      response.codigo = codigo;
    }

    return response;
  }

  async ativarDispositivoPorCodigo(data: unknown) {
    await this.ensureSchema();
    const payload = ativarDispositivoSchema.parse(data);
    const codigoHash = this.hashCodigoAtivacao(payload.codigo.trim());
    const normalizedDeviceId = String(payload.deviceId || '').trim() || null;

    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT id, entregador_id, nome_dispositivo, plataforma, device_id, created_by_user_id, expires_at, used_at, tentativas, blocked_until
      FROM rastreio_ativacao_mobile
      WHERE codigo_hash = ?
      LIMIT 1
      `,
      codigoHash,
    );

    let ativacao = rows[0];

    if (!ativacao && normalizedDeviceId) {
      const fallbackRows = await prisma.$queryRawUnsafe<Array<any>>(
        `
        SELECT id, tentativas, blocked_until
        FROM rastreio_ativacao_mobile
        WHERE device_id = ?
          AND used_at IS NULL
          AND expires_at > NOW(3)
        ORDER BY created_at DESC
        LIMIT 1
        `,
        normalizedDeviceId,
      );

      const fallback = fallbackRows[0];
      if (fallback) {
        if (!fallback.blocked_until || new Date(fallback.blocked_until).getTime() <= Date.now()) {
          await this.registrarTentativaInvalidaAtivacao(String(fallback.id), Number(fallback.tentativas || 0));
          await this.registrarAuditoriaAtivacao({
            evento: 'CODIGO_ATIVACAO_INVALIDO_TENTATIVA',
            activationId: String(fallback.id),
            deviceId: normalizedDeviceId,
            detalhes: { tentativasAtuais: Number(fallback.tentativas || 0) + 1 },
          });
        }
      }
    }

    if (!ativacao) {
      await this.registrarAuditoriaAtivacao({
        evento: 'CODIGO_ATIVACAO_INVALIDO_SEM_CORRESPONDENCIA',
        deviceId: normalizedDeviceId,
      });
      throw new Error('Codigo de ativacao invalido.');
    }

    if (ativacao.blocked_until && new Date(ativacao.blocked_until).getTime() > Date.now()) {
      await this.registrarAuditoriaAtivacao({
        evento: 'CODIGO_ATIVACAO_BLOQUEADO_TENTATIVAS',
        activationId: String(ativacao.id),
        entregadorId: String(ativacao.entregador_id),
        deviceId: normalizedDeviceId || String(ativacao.device_id || ''),
      });
      throw new Error('Codigo de ativacao bloqueado por tentativas. Gere um novo codigo no painel.');
    }

    const tentativasAtual = Number(ativacao.tentativas || 0);
    if (tentativasAtual >= ACTIVATION_CODE_MAX_ATTEMPTS) {
      await this.registrarAuditoriaAtivacao({
        evento: 'CODIGO_ATIVACAO_BLOQUEADO_LIMITE',
        activationId: String(ativacao.id),
        entregadorId: String(ativacao.entregador_id),
        deviceId: normalizedDeviceId || String(ativacao.device_id || ''),
      });
      throw new Error('Codigo de ativacao bloqueado por tentativas. Gere um novo codigo no painel.');
    }

    if (ativacao.used_at) throw new Error('Codigo de ativacao ja utilizado.');
    if (ativacao.expires_at && new Date(ativacao.expires_at).getTime() <= Date.now()) {
      await this.registrarAuditoriaAtivacao({
        evento: 'CODIGO_ATIVACAO_EXPIRADO',
        activationId: String(ativacao.id),
        entregadorId: String(ativacao.entregador_id),
        deviceId: normalizedDeviceId || String(ativacao.device_id || ''),
      });
      throw new Error('Codigo de ativacao expirado. Gere um novo codigo no painel.');
    }

    const entregador = await this.validarEntregador(String(ativacao.entregador_id));
    const dispositivo = await this.createDeviceRecord({
      entregadorId: String(ativacao.entregador_id),
      nomeDispositivo: payload.nomeDispositivo || ativacao.nome_dispositivo || undefined,
      plataforma: payload.plataforma || ativacao.plataforma || 'ANDROID',
      deviceId: payload.deviceId || ativacao.device_id || undefined,
      userId: ativacao.created_by_user_id ? String(ativacao.created_by_user_id) : null,
    });

    await prisma.$executeRawUnsafe(
      `
      UPDATE rastreio_ativacao_mobile
      SET used_at = NOW(3)
      WHERE id = ?
      `,
      String(ativacao.id),
    );

    await this.registrarAuditoriaAtivacao({
      evento: 'CODIGO_ATIVACAO_VALIDADO_SUCESSO',
      activationId: String(ativacao.id),
      entregadorId: String(ativacao.entregador_id),
      deviceId: normalizedDeviceId || String(ativacao.device_id || ''),
      detalhes: { dispositivoIdCriado: dispositivo.id },
    });

    return {
      ...dispositivo,
      entregadorNome: entregador.nome,
    };
  }

  async revogarDispositivo(id: string) {
    await this.ensureSchema();

    await prisma.$executeRawUnsafe(`
      UPDATE rastreio_sessao
      SET status = 'FINALIZADA',
          finalizada_em = COALESCE(finalizada_em, NOW(3)),
          motivo = COALESCE(motivo, 'DISPOSITIVO_REVOGADO')
      WHERE dispositivo_id = ?
        AND status = 'ATIVA'
    `, id);

    await prisma.$executeRawUnsafe(`UPDATE rastreio_dispositivo SET ativo = 0 WHERE id = ?`, id);
    return { ok: true };
  }

  async listarDispositivos() {
    await this.ensureSchema();

    const entregadorTable = await this.resolveEntregadorTableName();
    const joinEntregador = entregadorTable
      ? `LEFT JOIN ${entregadorTable} e ON e.id = d.entregador_id`
      : '';
    const selectEntregadorNome = entregadorTable ? 'e.nome AS entregador_nome' : 'NULL AS entregador_nome';

    const dispositivos = await prisma.$queryRawUnsafe<Array<any>>(`
      SELECT d.id, d.entregador_id, d.nome_dispositivo, d.plataforma, d.device_id,
             d.ativo, d.ultimo_ping_em, d.created_at, ${selectEntregadorNome}
      FROM rastreio_dispositivo d
      ${joinEntregador}
      ORDER BY d.created_at DESC
      LIMIT 500
    `);

    return dispositivos.map((item) => ({
      id: item.id,
      entregadorId: item.entregador_id,
      entregadorNome: item.entregador_nome || 'Entregador nao encontrado',
      nomeDispositivo: item.nome_dispositivo,
      plataforma: item.plataforma,
      deviceId: item.device_id,
      ativo: Boolean(item.ativo),
      ultimoPingEm: item.ultimo_ping_em,
      createdAt: item.created_at,
    }));
  }

  async iniciarSessaoMobile(token: string | null | undefined, data: unknown) {
    const dispositivo = await this.autenticarDispositivo(token || null);
    const payload = iniciarSessaoSchema.parse(data || {});

    const sessaoId = randomUUID();
    const iniciadaEm = payload.iniciadaEm || new Date();

    await prisma.$executeRawUnsafe(
      `
      UPDATE rastreio_sessao
      SET status = 'FINALIZADA',
          finalizada_em = COALESCE(finalizada_em, NOW(3)),
          motivo = COALESCE(motivo, 'SESSAO_REINICIADA')
      WHERE dispositivo_id = ?
        AND status = 'ATIVA'
      `,
      dispositivo.id,
    );

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO rastreio_sessao (
        id, entregador_id, dispositivo_id, status, venda_id, iniciada_em, metadata
      ) VALUES (?, ?, ?, 'ATIVA', ?, ?, ?)
      `,
      sessaoId,
      dispositivo.entregador_id,
      dispositivo.id,
      payload.vendaId || null,
      iniciadaEm,
      payload.metadata ? JSON.stringify(payload.metadata) : null,
    );

    await prisma.$executeRawUnsafe(
      `UPDATE rastreio_dispositivo SET ultimo_ping_em = ? WHERE id = ?`,
      new Date(),
      dispositivo.id,
    );

    return {
      sessaoId,
      entregadorId: dispositivo.entregador_id,
      iniciadaEm,
      status: 'ATIVA',
    };
  }

  async registrarPontoMobile(sessaoId: string, token: string | null | undefined, data: unknown) {
    const dispositivo = await this.autenticarDispositivo(token || null);
    const payload = pontoSchema.parse(data);

    const sessaoRows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT id, entregador_id, dispositivo_id, status
      FROM rastreio_sessao
      WHERE id = ?
      LIMIT 1
      `,
      sessaoId,
    );

    const sessao = sessaoRows[0];
    if (!sessao) throw new Error('Sessao de rastreio nao encontrada.');
    if (sessao.status !== 'ATIVA') throw new Error('Sessao de rastreio ja finalizada.');
    if (sessao.dispositivo_id !== dispositivo.id) throw new Error('Sessao nao pertence ao dispositivo informado.');

    const pontoId = randomUUID();
    const registradoEm = payload.registradoEm || new Date();
    const agora = Date.now();
    const tempoPonto = registradoEm.getTime();

    if (tempoPonto - agora > MAX_FUTURO_MS) {
      throw new Error('Horario do ponto invalido (futuro acima do permitido).');
    }

    if (agora - tempoPonto > MAX_PASSADO_MS) {
      throw new Error('Horario do ponto invalido (muito antigo).');
    }

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO rastreio_ponto (
        id, sessao_id, latitude, longitude, precisao, velocidade, direcao, bateria, fonte, registrado_em, raw
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      pontoId,
      sessaoId,
      payload.latitude,
      payload.longitude,
      payload.precisao || null,
      payload.velocidade || null,
      payload.direcao || null,
      payload.bateria || null,
      payload.fonte || null,
      registradoEm,
      payload.raw ? JSON.stringify(payload.raw) : null,
    );

    await prisma.$executeRawUnsafe(`UPDATE rastreio_dispositivo SET ultimo_ping_em = ? WHERE id = ?`, new Date(), dispositivo.id);

    return { ok: true, pontoId, registradoEm };
  }

  async finalizarSessaoMobile(sessaoId: string, token: string | null | undefined, data: unknown) {
    const dispositivo = await this.autenticarDispositivo(token || null);
    const payload = finalizarSessaoSchema.parse(data || {});

    const sessaoRows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT id, dispositivo_id, status
      FROM rastreio_sessao
      WHERE id = ?
      LIMIT 1
      `,
      sessaoId,
    );

    const sessao = sessaoRows[0];
    if (!sessao) throw new Error('Sessao de rastreio nao encontrada.');
    if (sessao.dispositivo_id !== dispositivo.id) throw new Error('Sessao nao pertence ao dispositivo informado.');
    if (sessao.status !== 'ATIVA') return { ok: true, status: 'FINALIZADA' };

    const finalizadaEm = payload.finalizadaEm || new Date();

    await prisma.$executeRawUnsafe(
      `
      UPDATE rastreio_sessao
      SET status = 'FINALIZADA', finalizada_em = ?, motivo = ?
      WHERE id = ?
      `,
      finalizadaEm,
      payload.motivo || null,
      sessaoId,
    );

    return { ok: true, status: 'FINALIZADA', finalizadaEm };
  }

  async listarSessoesAtivas() {
    await this.ensureSchema();

    const entregadorTable = await this.resolveEntregadorTableName();
    const joinEntregador = entregadorTable
      ? `LEFT JOIN ${entregadorTable} e ON e.id = s.entregador_id`
      : '';
    const selectEntregadorNome = entregadorTable ? 'e.nome AS entregador_nome' : 'NULL AS entregador_nome';

    const rows = await prisma.$queryRawUnsafe<Array<any>>(`
            SELECT s.id, s.entregador_id, s.dispositivo_id, s.venda_id, s.iniciada_em,
              ${selectEntregadorNome},
              p.latitude, p.longitude, p.precisao, p.velocidade, p.bateria, p.fonte, p.registrado_em, p.raw
      FROM rastreio_sessao s
      ${joinEntregador}
      LEFT JOIN rastreio_ponto p ON p.id = (
        SELECT p2.id FROM rastreio_ponto p2
        WHERE p2.sessao_id = s.id
        ORDER BY p2.registrado_em DESC
        LIMIT 1
      )
      WHERE s.status = 'ATIVA'
      ORDER BY s.iniciada_em DESC
      LIMIT 200
    `);

    const agora = Date.now();

    return rows.map((item) => {
      const ultimoPontoMs = item.registrado_em ? new Date(item.registrado_em).getTime() : null;
      const minutosSemAtualizar = ultimoPontoMs ? Math.floor((agora - ultimoPontoMs) / 60000) : null;
      const conexaoStatus = minutosSemAtualizar === null
        ? 'SEM_PONTOS'
        : minutosSemAtualizar > STALE_MINUTES_DEFAULT
          ? 'DESATUALIZADA'
          : 'ONLINE';

      const raw = lerRawJson(item.raw);

      return {
        sessaoId: item.id,
        entregadorId: item.entregador_id,
        entregadorNome: item.entregador_nome || 'Entregador nao encontrado',
        dispositivoId: item.dispositivo_id,
        vendaId: item.venda_id,
        iniciadaEm: item.iniciada_em,
        conexaoStatus,
        minutosSemAtualizar,
        ultimoPonto: item.registrado_em
          ? {
            latitude: Number(item.latitude),
            longitude: Number(item.longitude),
            precisao: item.precisao === null ? null : Number(item.precisao),
            velocidade: item.velocidade === null ? null : Number(item.velocidade),
            bateria: item.bateria === null ? null : Number(item.bateria),
            fonte: item.fonte,
            registradoEm: item.registrado_em,
            nota: typeof raw?.nota === 'string' ? raw.nota : null,
          }
          : null,
      };
    });
  }

  async resumoOperacional(staleMinutes = STALE_MINUTES_DEFAULT) {
    await this.ensureSchema();
    const sessoes = await this.listarSessoesAtivas();
    const staleLimit = Math.max(1, Math.min(60, Number(staleMinutes) || STALE_MINUTES_DEFAULT));

    const totalAtivas = sessoes.length;
    const online = sessoes.filter((item) => item.conexaoStatus === 'ONLINE').length;
    const semPontos = sessoes.filter((item) => item.conexaoStatus === 'SEM_PONTOS').length;
    const desatualizadas = sessoes.filter((item) => (item.minutosSemAtualizar ?? 0) > staleLimit).length;

    return {
      totalAtivas,
      online,
      semPontos,
      desatualizadas,
      staleMinutes: staleLimit,
      checkedAt: new Date().toISOString(),
    };
  }

  async obterUltimaPosicaoEntregador(entregadorId: string) {
    await this.ensureSchema();

    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT p.latitude, p.longitude, p.precisao, p.velocidade, p.direcao, p.bateria, p.fonte, p.registrado_em,
             s.id AS sessao_id, s.status
      FROM rastreio_ponto p
      INNER JOIN rastreio_sessao s ON s.id = p.sessao_id
      WHERE s.entregador_id = ?
      ORDER BY p.registrado_em DESC
      LIMIT 1
      `,
      entregadorId,
    );

    if (!rows[0]) return null;

    const item = rows[0];
    return {
      sessaoId: item.sessao_id,
      statusSessao: item.status,
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      precisao: item.precisao === null ? null : Number(item.precisao),
      velocidade: item.velocidade === null ? null : Number(item.velocidade),
      direcao: item.direcao === null ? null : Number(item.direcao),
      bateria: item.bateria === null ? null : Number(item.bateria),
      fonte: item.fonte,
      registradoEm: item.registrado_em,
    };
  }

  async listarPontosSessao(sessaoId: string, limit = 500) {
    await this.ensureSchema();
    const safeLimit = Math.max(1, Math.min(2000, Number(limit) || 500));

    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT id, latitude, longitude, precisao, velocidade, direcao, bateria, fonte, registrado_em, raw
      FROM rastreio_ponto
      WHERE sessao_id = ?
      ORDER BY registrado_em DESC
      LIMIT ?
      `,
      sessaoId,
      safeLimit,
    );

    return rows.map((item) => ({
      id: item.id,
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      precisao: item.precisao === null ? null : Number(item.precisao),
      velocidade: item.velocidade === null ? null : Number(item.velocidade),
      direcao: item.direcao === null ? null : Number(item.direcao),
      bateria: item.bateria === null ? null : Number(item.bateria),
      fonte: item.fonte,
      registradoEm: item.registrado_em,
      nota: typeof lerRawJson(item.raw)?.nota === 'string' ? lerRawJson(item.raw)?.nota : null,
    }));
  }

  async obterRastreioPublico(sessaoId: string, limit = 60) {
    await this.ensureSchema();
    const safeLimit = Math.max(1, Math.min(120, Number(limit) || 60));

    const entregadorTable = await this.resolveEntregadorTableName();
    const joinEntregador = entregadorTable
      ? `LEFT JOIN ${entregadorTable} e ON e.id = s.entregador_id`
      : '';
    const selectEntregadorNome = entregadorTable ? 'e.nome AS entregador_nome' : 'NULL AS entregador_nome';

    const sessaoRows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT s.id, s.entregador_id, s.dispositivo_id, s.venda_id, s.status, s.iniciada_em, s.finalizada_em, s.motivo,
             ${selectEntregadorNome}
      FROM rastreio_sessao s
      ${joinEntregador}
      WHERE s.id = ?
      LIMIT 1
      `,
      sessaoId,
    );

    const sessao = sessaoRows[0];
    if (!sessao) throw new Error('Sessao de rastreio nao encontrada.');

    const pontos = await this.listarPontosSessao(sessaoId, safeLimit);
    const ultimaPosicao = pontos[0] || null;

    const ultimoPontoComNota = pontos.find((item) => item.nota) || null;

    return {
      sessaoId: sessao.id,
      entregadorNome: sessao.entregador_nome || 'Entregador nao encontrado',
      vendaId: sessao.venda_id,
      status: sessao.status,
      motivo: sessao.motivo,
      iniciadaEm: sessao.iniciada_em,
      finalizadaEm: sessao.finalizada_em,
      ultimaPosicao,
      notaAtual: ultimaPosicao?.nota || ultimoPontoComNota?.nota || null,
      pontos,
      atualizadaEm: ultimaPosicao?.registradoEm || sessao.finalizada_em || sessao.iniciada_em,
    };
  }
}
