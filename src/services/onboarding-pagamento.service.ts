import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../database/prisma";
import { validatePasswordStrength } from "../utils/password-policy";
import onboardingAcessoService from "./onboarding-acesso.service";

type ProvedorPagamento = "ASAAS" | "MERCADO_PAGO" | "STRIPE" | "PAYPAL";

type PlanoSaas = {
  id: string;
  nome: string;
  precoMensal: number;
  moeda: "BRL" | "USD";
  limiteUsuarios: number;
  limiteEmpresas: number;
  recursos: string[];
};

type CadastroInicialInput = {
  empresaNome: string;
  empresaCnpj?: string;
  adminNome: string;
  adminEmail: string;
  adminSenha: string;
  planoId: string;
  providerPreferido?: ProvedorPagamento;
  pais?: string;
  moeda?: string;
  precisaPix?: boolean;
  finalidade: string;
  baseLegal: string;
  consentimentoLgpd: boolean;
};

const TABELA_PRE_CADASTRO = "saas_pre_cadastro";
const TABELA_ASSINATURA = "saas_assinatura";
const TABELA_AUDITORIA = "saas_onboarding_auditoria";

const planosBase: PlanoSaas[] = [
  {
    id: "starter",
    nome: "Starter",
    precoMensal: 149,
    moeda: "BRL",
    limiteUsuarios: 5,
    limiteEmpresas: 1,
    recursos: ["PDV", "Estoque", "Financeiro", "Integracoes basicas"],
  },
  {
    id: "growth",
    nome: "Growth",
    precoMensal: 349,
    moeda: "BRL",
    limiteUsuarios: 20,
    limiteEmpresas: 3,
    recursos: ["Tudo do Starter", "Automacoes", "Integracoes avancadas", "Suporte prioritario"],
  },
  {
    id: "scale",
    nome: "Scale",
    precoMensal: 899,
    moeda: "BRL",
    limiteUsuarios: 100,
    limiteEmpresas: 10,
    recursos: ["Tudo do Growth", "SLA dedicado", "Webhooks premium", "Governanca multiempresa"],
  },
];

const sanitizeEmail = (value: string) => String(value || "").trim().toLowerCase();

const parseJsonSafe = (value: unknown) => {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, any>;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, any>;
    } catch {
      return {};
    }
  }
  return {};
};

class OnboardingPagamentoService {
  private _tablesReady = false;

  async init() {
    await this.ensureTables();
  }

  private async ensureTables() {
    if (this._tablesReady) return;
    this._tablesReady = true;
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${TABELA_PRE_CADASTRO} (
        id VARCHAR(191) PRIMARY KEY,
        empresa_nome VARCHAR(191) NOT NULL,
        empresa_cnpj VARCHAR(40) NULL,
        admin_nome VARCHAR(191) NOT NULL,
        admin_email VARCHAR(191) NOT NULL,
        admin_senha_hash VARCHAR(191) NOT NULL,
        plano_id VARCHAR(40) NOT NULL,
        provider_preferido VARCHAR(40) NOT NULL,
        pais VARCHAR(10) NULL,
        moeda VARCHAR(10) NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'PENDENTE_PAGAMENTO',
        checkout_url TEXT NULL,
        payment_external_id VARCHAR(191) NULL,
        consentimento_lgpd BOOLEAN NOT NULL,
        finalidade VARCHAR(255) NOT NULL,
        base_legal VARCHAR(120) NOT NULL,
        consentimento_em DATETIME(3) NULL,
        ativado_em DATETIME(3) NULL,
        empresa_id VARCHAR(191) NULL,
        usuario_admin_id VARCHAR(191) NULL,
        metadata_json JSON NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        UNIQUE KEY uk_pre_cadastro_email_ativo (admin_email, status),
        INDEX idx_pre_cadastro_status (status),
        INDEX idx_pre_cadastro_plano (plano_id)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${TABELA_ASSINATURA} (
        id VARCHAR(191) PRIMARY KEY,
        pre_cadastro_id VARCHAR(191) NOT NULL,
        empresa_id VARCHAR(191) NULL,
        usuario_admin_id VARCHAR(191) NULL,
        plano_id VARCHAR(40) NOT NULL,
        provider VARCHAR(40) NOT NULL,
        status VARCHAR(40) NOT NULL,
        periodicidade VARCHAR(20) NOT NULL DEFAULT 'MENSAL',
        valor DECIMAL(12,2) NOT NULL,
        moeda VARCHAR(10) NOT NULL,
        started_at DATETIME(3) NULL,
        next_billing_at DATETIME(3) NULL,
        canceled_at DATETIME(3) NULL,
        external_subscription_id VARCHAR(191) NULL,
        metadata_json JSON NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        INDEX idx_assinatura_status (status),
        INDEX idx_assinatura_empresa (empresa_id)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${TABELA_AUDITORIA} (
        id VARCHAR(191) PRIMARY KEY,
        pre_cadastro_id VARCHAR(191) NULL,
        assinatura_id VARCHAR(191) NULL,
        acao VARCHAR(80) NOT NULL,
        detalhes_json JSON NULL,
        created_at DATETIME(3) NOT NULL,
        INDEX idx_onboarding_audit_cadastro (pre_cadastro_id),
        INDEX idx_onboarding_audit_assinatura (assinatura_id),
        INDEX idx_onboarding_audit_data (created_at)
      )
    `);
  }

  private async registrarAuditoria(input: {
    preCadastroId?: string;
    assinaturaId?: string;
    acao: string;
    detalhes?: Record<string, any>;
  }) {
    await this.ensureTables();
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO ${TABELA_AUDITORIA}
      (id, pre_cadastro_id, assinatura_id, acao, detalhes_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      crypto.randomUUID(),
      input.preCadastroId || null,
      input.assinaturaId || null,
      input.acao,
      JSON.stringify(input.detalhes || {}),
      new Date()
    );
  }

  private providerOrderByPreference(input: {
    providerPreferido?: ProvedorPagamento;
    pais?: string;
    moeda?: string;
    precisaPix?: boolean;
  }): ProvedorPagamento[] {
    const pais = (input.pais || "BR").toUpperCase();
    const moeda = (input.moeda || "BRL").toUpperCase();
    const precisaPix = Boolean(input.precisaPix);

    if (input.providerPreferido) {
      return [input.providerPreferido, "ASAAS", "MERCADO_PAGO", "STRIPE", "PAYPAL"].filter(
        (v, i, arr) => arr.indexOf(v as ProvedorPagamento) === i
      ) as ProvedorPagamento[];
    }

    if (pais === "BR" && precisaPix) return ["ASAAS", "MERCADO_PAGO", "STRIPE", "PAYPAL"];
    if (pais === "BR" && moeda === "BRL") return ["MERCADO_PAGO", "ASAAS", "STRIPE", "PAYPAL"];
    if (moeda === "USD") return ["STRIPE", "PAYPAL", "MERCADO_PAGO", "ASAAS"];

    return ["STRIPE", "PAYPAL", "MERCADO_PAGO", "ASAAS"];
  }

  private resolveCheckoutLink(provider: ProvedorPagamento, planoId: string) {
    const key = `SAAS_CHECKOUT_LINK_${provider}_${planoId}`.toUpperCase();
    return process.env[key] || "";
  }

  private buildMockCheckoutUrl(preCadastroId: string, provider: ProvedorPagamento) {
    const base = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
    return `${base}/onboarding/mock-checkout/${preCadastroId}?provider=${provider}`;
  }

  private escolherProviderECheckout(input: {
    planoId: string;
    providerPreferido?: ProvedorPagamento;
    pais?: string;
    moeda?: string;
    precisaPix?: boolean;
    preCadastroId: string;
  }) {
    const ordered = this.providerOrderByPreference(input);

    for (const provider of ordered) {
      const checkoutLink = this.resolveCheckoutLink(provider, input.planoId);
      if (checkoutLink) {
        return { provider, checkoutUrl: checkoutLink, mock: false };
      }
    }

    return {
      provider: ordered[0],
      checkoutUrl: this.buildMockCheckoutUrl(input.preCadastroId, ordered[0]),
      mock: true,
    };
  }

  listarPlanos() {
    return planosBase;
  }

  preferenciasModulo() {
    return {
      resumo: [
        "Checkout hospedado para reduzir friccao no cadastro.",
        "Provisionar acesso apenas apos evento de pagamento confirmado (webhook).",
        "Portal de assinante para troca de cartao/cancelamento.",
        "Idempotencia e assinatura de webhook obrigatorias.",
      ],
      recomendacoesPorCenario: {
        brasil_com_pix: ["ASAAS", "MERCADO_PAGO", "STRIPE", "PAYPAL"],
        brasil_cartao: ["MERCADO_PAGO", "ASAAS", "STRIPE", "PAYPAL"],
        internacional_usd: ["STRIPE", "PAYPAL", "MERCADO_PAGO", "ASAAS"],
      },
      referencias: [
        "https://docs.stripe.com/payments/checkout/build-subscriptions",
        "https://developer.paypal.com/docs/subscriptions/",
        "https://www.mercadopago.com.br/developers/pt/docs/subscriptions/overview",
        "https://docs.asaas.com/docs/assinaturas",
      ],
    };
  }

  async iniciarCadastroComPagamento(input: CadastroInicialInput) {
    await this.ensureTables();

    if (!input.consentimentoLgpd) throw new Error("consentimento_lgpd_obrigatorio");
    if (!input.finalidade?.trim()) throw new Error("finalidade_lgpd_obrigatoria");
    if (!input.baseLegal?.trim()) throw new Error("base_legal_lgpd_obrigatoria");

    const passwordValidation = validatePasswordStrength(input.adminSenha);
    if (!passwordValidation.ok) throw new Error(passwordValidation.message || "senha_invalida");

    const email = sanitizeEmail(input.adminEmail);
    const plano = planosBase.find((item) => item.id === input.planoId);
    if (!plano) throw new Error("plano_invalido");

    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    if (existingUser) throw new Error("email_ja_cadastrado");

    const preCadastroId = crypto.randomUUID();
    const senhaHash = await bcrypt.hash(input.adminSenha, 10);

    const providerResult = this.escolherProviderECheckout({
      planoId: input.planoId,
      providerPreferido: input.providerPreferido,
      pais: input.pais,
      moeda: input.moeda,
      precisaPix: input.precisaPix,
      preCadastroId,
    });

    const now = new Date();
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO ${TABELA_PRE_CADASTRO}
      (id, empresa_nome, empresa_cnpj, admin_nome, admin_email, admin_senha_hash,
       plano_id, provider_preferido, pais, moeda, status, checkout_url,
       consentimento_lgpd, finalidade, base_legal, consentimento_em,
       metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE_PAGAMENTO', ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      preCadastroId,
      input.empresaNome,
      input.empresaCnpj || null,
      input.adminNome,
      email,
      senhaHash,
      plano.id,
      providerResult.provider,
      (input.pais || "BR").toUpperCase(),
      (input.moeda || plano.moeda).toUpperCase(),
      providerResult.checkoutUrl,
      true,
      input.finalidade.trim(),
      input.baseLegal.trim(),
      now,
      JSON.stringify({
        providerMock: providerResult.mock,
        precisaPix: Boolean(input.precisaPix),
      }),
      now,
      now
    );

    await this.registrarAuditoria({
      preCadastroId,
      acao: "PRE_CADASTRO_INICIADO",
      detalhes: {
        providerEscolhido: providerResult.provider,
        planoId: plano.id,
      },
    });

    return {
      preCadastroId,
      status: "PENDENTE_PAGAMENTO",
      provider: providerResult.provider,
      checkoutUrl: providerResult.checkoutUrl,
      modo: providerResult.mock ? "mock" : "real",
      plano,
    };
  }

  async statusPreCadastro(preCadastroId: string) {
    await this.ensureTables();

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT id, empresa_nome, admin_email, plano_id, provider_preferido,
             status, checkout_url, ativado_em, empresa_id, usuario_admin_id,
             created_at, updated_at
      FROM ${TABELA_PRE_CADASTRO}
      WHERE id = ?
      LIMIT 1
      `,
      preCadastroId
    );

    if (!rows.length) throw new Error("pre_cadastro_nao_encontrado");

    const row = rows[0];
    return {
      id: row.id,
      empresaNome: row.empresa_nome,
      adminEmail: row.admin_email,
      planoId: row.plano_id,
      provider: row.provider_preferido,
      status: row.status,
      checkoutUrl: row.checkout_url,
      ativadoEm: row.ativado_em,
      empresaId: row.empresa_id,
      usuarioAdminId: row.usuario_admin_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listarAssinaturasPagas() {
    await this.ensureTables();

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        s.id,
        s.plano_id,
        s.provider,
        s.status,
        s.periodicidade,
        s.valor,
        s.moeda,
        s.next_billing_at,
        s.metadata_json,
        s.created_at,
        p.empresa_nome,
        p.admin_email,
        p.status AS pre_status
      FROM ${TABELA_ASSINATURA} s
      INNER JOIN ${TABELA_PRE_CADASTRO} p ON p.id = s.pre_cadastro_id
      ORDER BY s.created_at DESC
      `
    );

    return rows.map((row) => {
      const metadata = parseJsonSafe(row.metadata_json);
      return {
        id: row.id,
        empresaNome: row.empresa_nome,
        adminEmail: row.admin_email,
        planoId: row.plano_id,
        provider: row.provider,
        status: row.status,
        statusPreCadastro: row.pre_status,
        periodicidade: row.periodicidade,
        valor: Number(row.valor),
        moeda: row.moeda,
        nextBillingAt: row.next_billing_at,
        meioPagamento: metadata.paymentMethod || null,
        createdAt: row.created_at,
      };
    });
  }

  async editarAssinatura(input: {
    assinaturaId: string;
    planoId?: string;
    status?: string;
    periodicidade?: "MENSAL" | "ANUAL";
    nextBillingAt?: string;
  }) {
    await this.ensureTables();

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, plano_id, status, periodicidade, valor, moeda FROM ${TABELA_ASSINATURA} WHERE id = ? LIMIT 1`,
      input.assinaturaId
    );
    if (!rows.length) throw new Error("assinatura_nao_encontrada");

    const plano = input.planoId ? planosBase.find((item) => item.id === input.planoId) : null;
    if (input.planoId && !plano) throw new Error("plano_invalido");

    const nextBilling = input.nextBillingAt ? new Date(input.nextBillingAt) : null;
    if (input.nextBillingAt && Number.isNaN(nextBilling?.getTime())) {
      throw new Error("next_billing_invalido");
    }

    const valorAtual = Number(rows[0].valor);
    const moedaAtual = String(rows[0].moeda || "BRL");

    const now = new Date();
    await prisma.$executeRawUnsafe(
      `
      UPDATE ${TABELA_ASSINATURA}
      SET plano_id = ?,
          status = ?,
          periodicidade = ?,
          valor = ?,
          moeda = ?,
          next_billing_at = ?,
          updated_at = ?
      WHERE id = ?
      `,
      input.planoId || rows[0].plano_id,
      input.status || rows[0].status,
      input.periodicidade || rows[0].periodicidade,
      plano ? plano.precoMensal : valorAtual,
      plano ? plano.moeda : moedaAtual,
      nextBilling || null,
      now,
      input.assinaturaId
    );

    return { ok: true };
  }

  async editarMeioPagamento(input: {
    assinaturaId: string;
    metodo: string;
    titular?: string;
    finalCartao?: string;
    bandeira?: string;
    tokenReferencia?: string;
  }) {
    await this.ensureTables();

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, metadata_json FROM ${TABELA_ASSINATURA} WHERE id = ? LIMIT 1`,
      input.assinaturaId
    );
    if (!rows.length) throw new Error("assinatura_nao_encontrada");

    const metadata = parseJsonSafe(rows[0].metadata_json);
    metadata.paymentMethod = {
      metodo: input.metodo,
      titular: input.titular || null,
      finalCartao: input.finalCartao || null,
      bandeira: input.bandeira || null,
      tokenReferencia: input.tokenReferencia || null,
      atualizadoEm: new Date().toISOString(),
    };

    await prisma.$executeRawUnsafe(
      `
      UPDATE ${TABELA_ASSINATURA}
      SET metadata_json = ?, updated_at = ?
      WHERE id = ?
      `,
      JSON.stringify(metadata),
      new Date(),
      input.assinaturaId
    );

    return { ok: true, meioPagamento: metadata.paymentMethod };
  }

  async editarLoginCliente(input: { usuarioId: string; nome?: string; email?: string }) {
    const data: { nome?: string; email?: string } = {};
    if (input.nome) data.nome = String(input.nome).trim();
    if (input.email) data.email = sanitizeEmail(input.email);

    if (!data.nome && !data.email) {
      throw new Error("nenhum_campo_para_atualizar");
    }

    const usuario = await prisma.usuario.update({
      where: { id: input.usuarioId },
      data,
      select: {
        id: true,
        nome: true,
        email: true,
      },
    });

    return usuario;
  }

  async reenviarCodigoAtivacao(preCadastroId: string) {
    await this.ensureTables();

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT id, empresa_nome, admin_email, usuario_admin_id, status
      FROM ${TABELA_PRE_CADASTRO}
      WHERE id = ?
      LIMIT 1
      `,
      preCadastroId
    );
    if (!rows.length) throw new Error("pre_cadastro_nao_encontrado");

    const row = rows[0];
    if (!["AGUARDANDO_ATIVACAO", "ATIVO"].includes(String(row.status || ""))) {
      throw new Error("codigo_ativacao_indisponivel_para_status_atual");
    }

    return onboardingAcessoService.enviarCodigoAtivacao({
      preCadastroId,
      email: row.admin_email,
      empresaNome: row.empresa_nome,
      usuarioId: row.usuario_admin_id || undefined,
    });
  }

  async confirmarPagamento(params: {
    preCadastroId: string;
    provider: ProvedorPagamento;
    paymentStatus: "PAID" | "FAILED";
    externalPaymentId?: string;
    externalSubscriptionId?: string;
    metadata?: Record<string, any>;
  }) {
    await this.ensureTables();

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT id, empresa_nome, empresa_cnpj, admin_nome, admin_email, admin_senha_hash,
             plano_id, status
      FROM ${TABELA_PRE_CADASTRO}
      WHERE id = ?
      LIMIT 1
      `,
      params.preCadastroId
    );

    if (!rows.length) throw new Error("pre_cadastro_nao_encontrado");
    const pre = rows[0];

    if (pre.status === "ATIVO" && params.paymentStatus === "PAID") {
      return {
        alreadyProcessed: true,
        empresaId: null,
        usuarioAdminId: null,
      };
    }

    if (params.paymentStatus === "FAILED") {
      await prisma.$executeRawUnsafe(
        `
        UPDATE ${TABELA_PRE_CADASTRO}
        SET status = 'PAGAMENTO_FALHOU',
            payment_external_id = ?,
            updated_at = ?
        WHERE id = ?
        `,
        params.externalPaymentId || null,
        new Date(),
        params.preCadastroId
      );

      await this.registrarAuditoria({
        preCadastroId: params.preCadastroId,
        acao: "PAGAMENTO_FALHOU",
        detalhes: {
          provider: params.provider,
          externalPaymentId: params.externalPaymentId || null,
        },
      });

      return { ok: true, status: "PAGAMENTO_FALHOU" };
    }

    const empresa = await prisma.empresa.create({
      data: {
        nome: pre.empresa_nome,
        cnpj: pre.empresa_cnpj || null,
        ativo: true,
      },
    });

    const usuario = await prisma.usuario.create({
      data: {
        nome: pre.admin_nome,
        email: pre.admin_email,
        senha: pre.admin_senha_hash,
        role: "ADMIN",
      },
    });

    const assinaturaId = crypto.randomUUID();
    const plano = planosBase.find((p) => p.id === pre.plano_id) || planosBase[0];
    const now = new Date();

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO ${TABELA_ASSINATURA}
      (id, pre_cadastro_id, empresa_id, usuario_admin_id, plano_id, provider, status,
       periodicidade, valor, moeda, started_at, external_subscription_id, metadata_json,
       created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'ATIVA', 'MENSAL', ?, ?, ?, ?, ?, ?, ?)
      `,
      assinaturaId,
      params.preCadastroId,
      empresa.id,
      usuario.id,
      plano.id,
      params.provider,
      plano.precoMensal,
      plano.moeda,
      now,
      params.externalSubscriptionId || null,
      JSON.stringify(params.metadata || {}),
      now,
      now
    );

    await prisma.$executeRawUnsafe(
      `
      UPDATE ${TABELA_PRE_CADASTRO}
      SET status = 'AGUARDANDO_ATIVACAO',
          payment_external_id = ?,
          ativado_em = NULL,
          empresa_id = ?,
          usuario_admin_id = ?,
          updated_at = ?
      WHERE id = ?
      `,
      params.externalPaymentId || null,
      empresa.id,
      usuario.id,
      now,
      params.preCadastroId
    );

    const ativacao = await onboardingAcessoService.enviarCodigoAtivacao({
      preCadastroId: params.preCadastroId,
      email: pre.admin_email,
      empresaNome: pre.empresa_nome,
      usuarioId: usuario.id,
    });

    await this.registrarAuditoria({
      preCadastroId: params.preCadastroId,
      assinaturaId,
      acao: "PAGAMENTO_CONFIRMADO_E_PROVISIONADO",
      detalhes: {
        provider: params.provider,
        empresaId: empresa.id,
        usuarioAdminId: usuario.id,
        externalPaymentId: params.externalPaymentId || null,
      },
    });

    return {
      ok: true,
      assinaturaId,
      empresaId: empresa.id,
      usuarioAdminId: usuario.id,
      ativacao,
    };
  }
}

const onboardingPagamentoService = new OnboardingPagamentoService();
export default onboardingPagamentoService;
