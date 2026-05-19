import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../database/prisma";
import { validatePasswordStrength } from "../utils/password-policy";

export type CadastroAcessoInput = {
  userIdAlvo: string;
  nomeAcesso: string;
  areasPermitidas: string[];
  restricoes?: Record<string, any>;
  dadosPermitidos: string[];
  baseLegal: string;
  finalidade: string;
  justificativa?: string;
  expiraEm?: string;
  autorUserId: string;
};

const TABELA_ACESSO = "acesso_restrito";
const TABELA_AUDITORIA = "acesso_lgpd_auditoria";

type PerfilHierarquia = {
  id: string;
  nome: string;
  descricao: string;
  nivel: number;
  roleBase: "ADMIN" | "GERENTE" | "VENDEDOR" | "CAIXA" | "ESTOQUISTA" | "USER";
  areasPadrao: string[];
  dadosPermitidosPadrao: string[];
};

const AREAS_SISTEMA = [
  "dashboard",
  "agenda",
  "clientes",
  "vendas",
  "consulta-vendas",
  "devolucoes",
  "comissoes",
  "cadastro-produtos",
  "fornecedores",
  "marcas",
  "estoque",
  "compras",
  "financeiro",
  "lancamentos",
  "conciliacao",
  "fluxo-caixa",
  "categorias",
  "formas-pagamento",
  "integracoes",
  "diagnostico",
  "relatorios",
  "cadastros",
  "acessos",
];

const PERFIS_HIERARQUIA: PerfilHierarquia[] = [
  {
    id: "admin-master",
    nome: "Administrador Master",
    descricao: "Acesso total ao sistema e gestão de usuários e requisitos.",
    nivel: 100,
    roleBase: "ADMIN",
    areasPadrao: ["*"],
    dadosPermitidosPadrao: ["*"],
  },
  {
    id: "gerente-geral",
    nome: "Gerente Geral",
    descricao: "Gestão de operação, financeiro e time com acesso amplo.",
    nivel: 90,
    roleBase: "GERENTE",
    areasPadrao: [
      "dashboard",
      "agenda",
      "clientes",
      "vendas",
      "consulta-vendas",
      "devolucoes",
      "comissoes",
      "cadastro-produtos",
      "fornecedores",
      "marcas",
      "estoque",
      "compras",
      "financeiro",
      "lancamentos",
      "conciliacao",
      "fluxo-caixa",
      "categorias",
      "formas-pagamento",
      "integracoes",
      "relatorios",
      "acessos",
    ],
    dadosPermitidosPadrao: ["vendas", "estoque", "financeiro", "clientes", "integracoes"],
  },
  {
    id: "supervisor-vendas",
    nome: "Supervisor de Vendas",
    descricao: "Foco em vendas, clientes e metas comerciais.",
    nivel: 75,
    roleBase: "VENDEDOR",
    areasPadrao: ["dashboard", "agenda", "clientes", "vendas", "consulta-vendas", "devolucoes", "comissoes", "relatorios"],
    dadosPermitidosPadrao: ["vendas", "clientes", "comissoes"],
  },
  {
    id: "operador-caixa",
    nome: "Operador de Caixa",
    descricao: "Operações de PDV e fechamento de caixa.",
    nivel: 60,
    roleBase: "CAIXA",
    areasPadrao: ["dashboard", "clientes", "vendas", "consulta-vendas", "formas-pagamento"],
    dadosPermitidosPadrao: ["vendas", "clientes", "pagamentos"],
  },
  {
    id: "estoquista",
    nome: "Estoquista",
    descricao: "Gestão de estoque, produtos e fornecedores.",
    nivel: 55,
    roleBase: "ESTOQUISTA",
    areasPadrao: ["dashboard", "estoque", "cadastro-produtos", "fornecedores", "marcas", "compras"],
    dadosPermitidosPadrao: ["estoque", "produtos", "fornecedores"],
  },
  {
    id: "estagiario",
    nome: "Estagiário",
    descricao: "Acesso inicial controlado, focado em tarefas operacionais.",
    nivel: 20,
    roleBase: "USER",
    areasPadrao: ["dashboard", "agenda", "clientes"],
    dadosPermitidosPadrao: ["clientes-basico"],
  },
];

const sanitizeArea = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_.]/g, "");

class AcessosService {
  private _tablesReady = false;

  private getAreasPadraoPorRole(role?: string) {
    const normalizedRole = String(role || "").toUpperCase();
    if (!normalizedRole || normalizedRole === "ADMIN") return [];

    const perfil = PERFIS_HIERARQUIA.find((item) => item.roleBase === normalizedRole && item.id !== "admin-master");
    return perfil?.areasPadrao || [];
  }

  private getDadosPermitidosPadraoPorRole(role?: string) {
    const normalizedRole = String(role || "").toUpperCase();
    if (!normalizedRole || normalizedRole === "ADMIN") return [];

    const perfil = PERFIS_HIERARQUIA.find((item) => item.roleBase === normalizedRole && item.id !== "admin-master");
    return perfil?.dadosPermitidosPadrao || ["operacao-basica"];
  }

  async init() {
    await this.ensureTables();
  }

  private async ensureTables() {
    if (this._tablesReady) return;
    this._tablesReady = true;
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${TABELA_ACESSO} (
        id VARCHAR(191) PRIMARY KEY,
        user_id VARCHAR(191) NOT NULL,
        nome_acesso VARCHAR(120) NOT NULL,
        areas_json JSON NOT NULL,
        restricoes_json JSON NULL,
        dados_permitidos_json JSON NOT NULL,
        base_legal VARCHAR(120) NOT NULL,
        finalidade VARCHAR(255) NOT NULL,
        justificativa TEXT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
        created_by_user_id VARCHAR(191) NOT NULL,
        expires_at DATETIME(3) NULL,
        revoked_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        INDEX idx_acesso_user_status (user_id, status),
        INDEX idx_acesso_expires_at (expires_at)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${TABELA_AUDITORIA} (
        id VARCHAR(191) PRIMARY KEY,
        acesso_id VARCHAR(191) NULL,
        user_id VARCHAR(191) NOT NULL,
        acao VARCHAR(60) NOT NULL,
        detalhes_json JSON NULL,
        autor_user_id VARCHAR(191) NOT NULL,
        created_at DATETIME(3) NOT NULL,
        INDEX idx_audit_user_date (user_id, created_at),
        INDEX idx_audit_acesso (acesso_id)
      )
    `);
  }

  private normalizeAreas(areas: string[]) {
    const normalized = (areas || [])
      .map((item) => sanitizeArea(String(item || "")))
      .filter(Boolean);
    return Array.from(new Set(normalized));
  }

  private normalizeDadosPermitidos(dados: string[]) {
    const normalized = (dados || [])
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(normalized));
  }

  listarPerfisHierarquia() {
    return {
      perfis: PERFIS_HIERARQUIA,
      areasDisponiveis: AREAS_SISTEMA,
    };
  }

  async criarFuncionarioHierarquia(input: {
    nome: string;
    email: string;
    senha: string;
    perfilId: string;
    areasExtras?: string[];
    areasRemovidas?: string[];
    dadosPermitidosExtras?: string[];
    dadosPermitidosRemovidos?: string[];
    autorUserId: string;
  }) {
    await this.ensureTables();

    const perfil = PERFIS_HIERARQUIA.find((item) => item.id === input.perfilId);
    if (!perfil) throw new Error("perfil_hierarquico_invalido");

    const email = String(input.email || "").trim().toLowerCase();
    if (!email) throw new Error("email_obrigatorio");
    if (!String(input.nome || "").trim()) throw new Error("nome_obrigatorio");

    const passwordValidation = validatePasswordStrength(input.senha);
    if (!passwordValidation.ok) throw new Error(passwordValidation.message || "senha_invalida");

    const existing = await prisma.usuario.findUnique({ where: { email } });
    if (existing) throw new Error("email_ja_cadastrado");

    const areasBase = perfil.areasPadrao.includes("*") ? ["*"] : this.normalizeAreas(perfil.areasPadrao);
    const extras = this.normalizeAreas(input.areasExtras || []);
    const removidas = this.normalizeAreas(input.areasRemovidas || []);

    let areasFinal = areasBase;
    if (!areasBase.includes("*")) {
      const merged = new Set<string>([...areasBase, ...extras]);
      removidas.forEach((item) => merged.delete(item));
      areasFinal = Array.from(merged);
    }

    const dadosBase = this.normalizeDadosPermitidos(perfil.dadosPermitidosPadrao);
    const dadosExtras = this.normalizeDadosPermitidos(input.dadosPermitidosExtras || []);
    const dadosRemovidos = this.normalizeDadosPermitidos(input.dadosPermitidosRemovidos || []);
    const dadosFinal = Array.from(new Set([...dadosBase, ...dadosExtras])).filter((item) => !dadosRemovidos.includes(item));

    const senhaHash = await bcrypt.hash(input.senha, 10);

    const novoUsuario = await prisma.usuario.create({
      data: {
        nome: String(input.nome || "").trim(),
        email,
        senha: senhaHash,
        role: perfil.roleBase,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    let acessoHierarquico: any = null;
    if (perfil.roleBase !== "ADMIN") {
      acessoHierarquico = await this.cadastrarAcesso({
        userIdAlvo: novoUsuario.id,
        nomeAcesso: `perfil-hierarquia:${perfil.id}`,
        areasPermitidas: areasFinal,
        dadosPermitidos: dadosFinal.length > 0 ? dadosFinal : ["operacao-basica"],
        baseLegal: "execucao_de_contrato",
        finalidade: "controle_hierarquico_de_acesso",
        justificativa: `Perfil hierarquico inicial ${perfil.nome}`,
        autorUserId: input.autorUserId,
      });
    }

    return {
      usuario: novoUsuario,
      perfil,
      permissoes: {
        areasPermitidas: perfil.roleBase === "ADMIN" ? ["*"] : areasFinal,
        dadosPermitidos: perfil.roleBase === "ADMIN" ? ["*"] : (dadosFinal.length > 0 ? dadosFinal : ["operacao-basica"]),
      },
      acessoHierarquico,
    };
  }

  async atualizarPermissoesHierarquia(input: {
    userIdAlvo: string;
    areasExtras?: string[];
    areasRemovidas?: string[];
    dadosPermitidosExtras?: string[];
    dadosPermitidosRemovidos?: string[];
    justificativa?: string;
    autorUserId: string;
  }) {
    await this.ensureTables();

    const usuario = await prisma.usuario.findUnique({
      where: { id: input.userIdAlvo },
      select: { id: true, role: true },
    });

    if (!usuario) throw new Error("usuario_nao_encontrado");
    if (usuario.role === "ADMIN") {
      return {
        userId: usuario.id,
        role: usuario.role,
        areasPermitidas: ["*"],
        dadosPermitidos: ["*"],
        message: "admin_possui_acesso_total",
      };
    }

    const baseAreas = this.getAreasPadraoPorRole(usuario.role);
    const extras = this.normalizeAreas(input.areasExtras || []);
    const removidas = this.normalizeAreas(input.areasRemovidas || []);

    const mergedAreas = new Set<string>([...this.normalizeAreas(baseAreas), ...extras]);
    removidas.forEach((item) => mergedAreas.delete(item));
    const areasFinal = Array.from(mergedAreas);

    if (areasFinal.length === 0) {
      throw new Error("usuario_precisa_ao_menos_uma_area");
    }

    const baseDados = this.getDadosPermitidosPadraoPorRole(usuario.role);
    const dadosExtras = this.normalizeDadosPermitidos(input.dadosPermitidosExtras || []);
    const dadosRemovidos = this.normalizeDadosPermitidos(input.dadosPermitidosRemovidos || []);
    const dadosFinal = Array.from(new Set([...this.normalizeDadosPermitidos(baseDados), ...dadosExtras])).filter(
      (item) => !dadosRemovidos.includes(item)
    );

    await prisma.$executeRawUnsafe(
      `
      UPDATE ${TABELA_ACESSO}
      SET status = 'REVOGADO', revoked_at = ?, updated_at = ?
      WHERE user_id = ?
        AND status = 'ATIVO'
        AND nome_acesso LIKE 'perfil-hierarquia:%'
      `,
      new Date(),
      new Date(),
      usuario.id
    );

    const novoAcesso = await this.cadastrarAcesso({
      userIdAlvo: usuario.id,
      nomeAcesso: `perfil-hierarquia:custom-${Date.now()}`,
      areasPermitidas: areasFinal,
      dadosPermitidos: dadosFinal.length > 0 ? dadosFinal : ["operacao-basica"],
      baseLegal: "execucao_de_contrato",
      finalidade: "ajuste_de_permissoes_por_hierarquia",
      justificativa: input.justificativa || "Ajuste manual de requisitos por administrador",
      autorUserId: input.autorUserId,
    });

    return {
      userId: usuario.id,
      role: usuario.role,
      areasPermitidas: areasFinal,
      dadosPermitidos: dadosFinal.length > 0 ? dadosFinal : ["operacao-basica"],
      acesso: novoAcesso,
    };
  }

  async listarFuncionariosHierarquia() {
    await this.ensureTables();

    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return Promise.all(
      usuarios.map(async (usuario) => {
        const areasPermitidas = await this.listarAreasPermitidas(usuario.id, usuario.role);
        return {
          ...usuario,
          areasPermitidas,
        };
      })
    );
  }

  private async registrarAuditoria(input: {
    acessoId?: string | null;
    userId: string;
    acao: string;
    detalhes?: Record<string, any>;
    autorUserId: string;
  }) {
    await this.ensureTables();
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO ${TABELA_AUDITORIA}
      (id, acesso_id, user_id, acao, detalhes_json, autor_user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      crypto.randomUUID(),
      input.acessoId || null,
      input.userId,
      input.acao,
      JSON.stringify(input.detalhes || {}),
      input.autorUserId,
      new Date()
    );
  }

  async cadastrarAcesso(input: CadastroAcessoInput) {
    await this.ensureTables();

    const areasPermitidas = this.normalizeAreas(input.areasPermitidas);
    if (areasPermitidas.length === 0) {
      throw new Error("areas_permitidas_obrigatorias");
    }

    if (!input.finalidade?.trim()) {
      throw new Error("finalidade_lgpd_obrigatoria");
    }

    if (!input.baseLegal?.trim()) {
      throw new Error("base_legal_lgpd_obrigatoria");
    }

    if (!Array.isArray(input.dadosPermitidos) || input.dadosPermitidos.length === 0) {
      throw new Error("dados_permitidos_obrigatorios");
    }

    const expiresAt = input.expiraEm ? new Date(input.expiraEm) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new Error("data_expiracao_invalida");
    }

    const id = crypto.randomUUID();
    const now = new Date();

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO ${TABELA_ACESSO}
      (id, user_id, nome_acesso, areas_json, restricoes_json, dados_permitidos_json, base_legal, finalidade, justificativa, status, created_by_user_id, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ATIVO', ?, ?, ?, ?)
      `,
      id,
      input.userIdAlvo,
      input.nomeAcesso,
      JSON.stringify(areasPermitidas),
      JSON.stringify(input.restricoes || {}),
      JSON.stringify(input.dadosPermitidos),
      input.baseLegal.trim(),
      input.finalidade.trim(),
      input.justificativa || null,
      input.autorUserId,
      expiresAt,
      now,
      now
    );

    await this.registrarAuditoria({
      acessoId: id,
      userId: input.userIdAlvo,
      acao: "ACESSO_CADASTRADO",
      detalhes: {
        areasPermitidas,
        finalidade: input.finalidade,
        baseLegal: input.baseLegal,
      },
      autorUserId: input.autorUserId,
    });

    return {
      id,
      userId: input.userIdAlvo,
      nomeAcesso: input.nomeAcesso,
      areasPermitidas,
      finalidade: input.finalidade,
      baseLegal: input.baseLegal,
      status: "ATIVO",
      expiraEm: expiresAt,
    };
  }

  async revogarAcesso(params: { acessoId: string; autorUserId: string; motivo?: string }) {
    await this.ensureTables();

    const row = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, user_id FROM ${TABELA_ACESSO} WHERE id = ? LIMIT 1`,
      params.acessoId
    );

    if (!row.length) {
      throw new Error("acesso_nao_encontrado");
    }

    await prisma.$executeRawUnsafe(
      `
      UPDATE ${TABELA_ACESSO}
      SET status = 'REVOGADO', revoked_at = ?, updated_at = ?
      WHERE id = ?
      `,
      new Date(),
      new Date(),
      params.acessoId
    );

    await this.registrarAuditoria({
      acessoId: params.acessoId,
      userId: row[0].user_id,
      acao: "ACESSO_REVOGADO",
      detalhes: { motivo: params.motivo || "nao_informado" },
      autorUserId: params.autorUserId,
    });

    return { ok: true };
  }

  async listarAcessosPorUsuario(userId: string) {
    await this.ensureTables();

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT id, user_id, nome_acesso, areas_json, restricoes_json, dados_permitidos_json,
             base_legal, finalidade, justificativa, status, created_by_user_id,
             expires_at, revoked_at, created_at, updated_at
      FROM ${TABELA_ACESSO}
      WHERE user_id = ?
      ORDER BY updated_at DESC
      `,
      userId
    );

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      nomeAcesso: row.nome_acesso,
      areasPermitidas: row.areas_json ? JSON.parse(row.areas_json) : [],
      restricoes: row.restricoes_json ? JSON.parse(row.restricoes_json) : {},
      dadosPermitidos: row.dados_permitidos_json ? JSON.parse(row.dados_permitidos_json) : [],
      baseLegal: row.base_legal,
      finalidade: row.finalidade,
      justificativa: row.justificativa,
      status: row.status,
      createdByUserId: row.created_by_user_id,
      expiraEm: row.expires_at,
      revogadoEm: row.revoked_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async listarTodosAcessos() {
    await this.ensureTables();

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT id, user_id, nome_acesso, areas_json, dados_permitidos_json,
             base_legal, finalidade, status, expires_at, revoked_at, updated_at
      FROM ${TABELA_ACESSO}
      ORDER BY updated_at DESC
      `
    );

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      nomeAcesso: row.nome_acesso,
      areasPermitidas: row.areas_json ? JSON.parse(row.areas_json) : [],
      dadosPermitidos: row.dados_permitidos_json ? JSON.parse(row.dados_permitidos_json) : [],
      baseLegal: row.base_legal,
      finalidade: row.finalidade,
      status: row.status,
      expiraEm: row.expires_at,
      revogadoEm: row.revoked_at,
      updatedAt: row.updated_at,
    }));
  }

  async listarAuditoriaLgpd(userId?: string) {
    await this.ensureTables();

    const rows = userId
      ? await prisma.$queryRawUnsafe<any[]>(
          `
          SELECT id, acesso_id, user_id, acao, detalhes_json, autor_user_id, created_at
          FROM ${TABELA_AUDITORIA}
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 300
          `,
          userId
        )
      : await prisma.$queryRawUnsafe<any[]>(
          `
          SELECT id, acesso_id, user_id, acao, detalhes_json, autor_user_id, created_at
          FROM ${TABELA_AUDITORIA}
          ORDER BY created_at DESC
          LIMIT 300
          `
        );

    return rows.map((row) => ({
      id: row.id,
      acessoId: row.acesso_id,
      userId: row.user_id,
      acao: row.acao,
      detalhes: row.detalhes_json ? JSON.parse(row.detalhes_json) : {},
      autorUserId: row.autor_user_id,
      createdAt: row.created_at,
    }));
  }

  async validarAcessoArea(userId: string, role: string | undefined, area: string) {
    if (!userId) return false;
    if (role === "ADMIN") return true;

    const normalizedArea = sanitizeArea(area);
    const areasPadrao = this.getAreasPadraoPorRole(role);
    if (areasPadrao.includes(normalizedArea)) {
      return true;
    }

    await this.ensureTables();
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT id
      FROM ${TABELA_ACESSO}
      WHERE user_id = ?
        AND status = 'ATIVO'
        AND (expires_at IS NULL OR expires_at > NOW())
        AND revoked_at IS NULL
        AND JSON_CONTAINS(areas_json, JSON_QUOTE(?))
      LIMIT 1
      `,
      userId,
      normalizedArea
    );

    return rows.length > 0;
  }

  async listarAreasPermitidas(userId: string, role?: string) {
    if (role === "ADMIN") return ["*"];

    const acessos = await this.listarAcessosPorUsuario(userId);
    const now = Date.now();

    const areas = new Set<string>(this.getAreasPadraoPorRole(role));
    acessos
      .filter((item) => {
        if (item.status !== "ATIVO") return false;
        if (!item.expiraEm) return true;
        const expiresAt = new Date(item.expiraEm).getTime();
        return expiresAt > now;
      })
      .forEach((item) => {
        (item.areasPermitidas || []).forEach((area: string) => areas.add(area));
      });

    return Array.from(areas);
  }
}

const acessosService = new AcessosService();
export default acessosService;
