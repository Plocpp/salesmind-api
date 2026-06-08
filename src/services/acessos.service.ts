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
const TABELA_PERFIL_HIERARQUIA = "perfil_hierarquia_custom";
const PERFIL_ENTREGADOR_NATIVO_ID = "entregador-transporte";
const AREA_RASTREIO_TRANSPORTE = "rastreio-transporte";

const ROLE_BASE_OPTIONS = ["ADMIN", "GERENTE", "VENDEDOR", "CAIXA", "ESTOQUISTA", "USER"] as const;
type RoleBase = (typeof ROLE_BASE_OPTIONS)[number];

type PerfilHierarquia = {
  id: string;
  nome: string;
  descricao: string;
  nivel: number;
  roleBase: RoleBase;
  areasPadrao: string[];
  dadosPermitidosPadrao: string[];
  origem?: "PADRAO" | "CUSTOM";
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
  "rastreio-transporte",
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
      "rastreio-transporte",
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
  {
    id: PERFIL_ENTREGADOR_NATIVO_ID,
    nome: "Entregador",
    descricao: "Perfil nativo vinculado ao transporte de rastreamento e operação de entrega.",
    nivel: 40,
    roleBase: "USER",
    areasPadrao: ["dashboard", AREA_RASTREIO_TRANSPORTE],
    dadosPermitidosPadrao: ["rastreio", "entregas"],
  },
];

const sanitizeArea = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_.]/g, "");

const parseStoredStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") return [];

  const raw = value.trim();
  if (!raw) return [];

  if (raw.startsWith("[") || raw.startsWith("\"[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || "").trim())
          .filter(Boolean);
      }
    } catch {
      // Legacy rows may contain comma-separated strings instead of JSON arrays.
    }
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseStoredObject = (value: unknown): Record<string, any> => {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  if (typeof value !== "string") return {};

  const raw = value.trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Backward compatibility: ignore malformed legacy payloads.
  }

  return {};
};

class AcessosService {
  private _tablesReady = false;
  private entregadorTableName: string | null | undefined = undefined;

  private async ensureEntregadorTable() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS entregador (
        id VARCHAR(191) PRIMARY KEY,
        nome VARCHAR(191) NOT NULL,
        email VARCHAR(191) NULL,
        telefone VARCHAR(60) NULL,
        cpf VARCHAR(60) NULL,
        endereco TEXT NULL,
        veiculoId VARCHAR(191) NULL,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_entregador_nome (nome),
        INDEX idx_entregador_email (email),
        INDEX idx_entregador_ativo (ativo)
      )
    `);

    this.entregadorTableName = "entregador";
    return this.entregadorTableName;
  }

  private normalizeRoleBase(role?: string): RoleBase {
    const normalized = String(role || "").trim().toUpperCase() as RoleBase;
    if (!ROLE_BASE_OPTIONS.includes(normalized)) {
      throw new Error("role_base_invalida");
    }
    return normalized;
  }

  private async listarPerfisCustomizados() {
    await this.ensureTables();

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT id, nome, descricao, nivel, role_base, areas_json, dados_permitidos_json
      FROM ${TABELA_PERFIL_HIERARQUIA}
      ORDER BY nivel DESC, nome ASC
      `
    );

    return rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      descricao: row.descricao,
      nivel: Number(row.nivel),
      roleBase: this.normalizeRoleBase(row.role_base),
      areasPadrao: parseStoredStringList(row.areas_json),
      dadosPermitidosPadrao: parseStoredStringList(row.dados_permitidos_json),
      origem: "CUSTOM" as const,
    }));
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
    this.entregadorTableName = /^[a-zA-Z0-9_]+$/.test(tableName || "") ? tableName : null;

    if (!this.entregadorTableName) {
      return this.ensureEntregadorTable();
    }

    return this.entregadorTableName;
  }

  private async usuarioTemPerfilEntregadorNativo(userId: string) {
    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT id
      FROM ${TABELA_ACESSO}
      WHERE user_id = ?
        AND status = 'ATIVO'
        AND nome_acesso = ?
      LIMIT 1
      `,
      userId,
      `perfil-hierarquia:${PERFIL_ENTREGADOR_NATIVO_ID}`,
    );

    return Boolean(rows[0]);
  }

  private async repararConsistenciaEntregadorNativo() {
    const report = {
      analisados: 0,
      acessosAtualizados: 0,
      rolesCorrigidas: 0,
      entregadoresSincronizados: 0,
      erros: 0,
    };

    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT a.id AS acesso_id, a.user_id, a.areas_json, u.nome, u.email, u.role
      FROM ${TABELA_ACESSO} a
      INNER JOIN Usuario u ON u.id = a.user_id
      WHERE a.status = 'ATIVO'
        AND a.nome_acesso = ?
      LIMIT 500
      `,
      `perfil-hierarquia:${PERFIL_ENTREGADOR_NATIVO_ID}`,
    );

    for (const row of rows) {
      report.analisados += 1;

      try {
        const userId = String(row.user_id || "");
        const nome = String(row.nome || "").trim();
        const email = String(row.email || "").trim().toLowerCase();
        const role = String(row.role || "").toUpperCase();
        const areas = this.normalizeAreas(parseStoredStringList(row.areas_json));

        if (!areas.includes(AREA_RASTREIO_TRANSPORTE)) {
          const novasAreas = Array.from(new Set([...areas, AREA_RASTREIO_TRANSPORTE]));
          await prisma.$executeRawUnsafe(
            `
            UPDATE ${TABELA_ACESSO}
            SET areas_json = ?, updated_at = ?
            WHERE id = ?
            `,
            JSON.stringify(novasAreas),
            new Date(),
            String(row.acesso_id || ""),
          );
          report.acessosAtualizados += 1;
        }

        if (role !== "USER" && userId) {
          await prisma.usuario.update({
            where: { id: userId },
            data: { role: "USER" },
          });
          report.rolesCorrigidas += 1;
        }

        await this.sincronizarCadastroEntregador({ nome, email });
        report.entregadoresSincronizados += 1;
      } catch {
        report.erros += 1;
      }
    }

    return report;
  }

  async reconciliarEntregadoresNativos() {
    await this.ensureTables();
    const report = await this.repararConsistenciaEntregadorNativo();
    return {
      ...report,
      executadoEm: new Date().toISOString(),
    };
  }

  private async resolverPerfilHierarquia(perfilId: string) {
    const perfisCustomizados = await this.listarPerfisCustomizados();
    return [...PERFIS_HIERARQUIA, ...perfisCustomizados].find((item) => item.id === perfilId) || null;
  }

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

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${TABELA_PERFIL_HIERARQUIA} (
        id VARCHAR(191) PRIMARY KEY,
        nome VARCHAR(120) NOT NULL,
        descricao TEXT NOT NULL,
        nivel INT NOT NULL,
        role_base VARCHAR(40) NOT NULL,
        areas_json JSON NOT NULL,
        dados_permitidos_json JSON NOT NULL,
        created_by_user_id VARCHAR(191) NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        UNIQUE KEY uk_perfil_hierarquia_nome (nome)
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

  private perfilRepresentaEntregador(perfil: PerfilHierarquia) {
    if (perfil.id === PERFIL_ENTREGADOR_NATIVO_ID) return true;
    const nome = String(perfil.nome || "").trim().toLowerCase();
    const temAreaRastreio = this.normalizeAreas(perfil.areasPadrao || []).includes(AREA_RASTREIO_TRANSPORTE);
    return nome.includes("entregador") || (perfil.roleBase === "USER" && temAreaRastreio);
  }

  private async sincronizarCadastroEntregador(input: {
    nome: string;
    email: string;
    emailAnterior?: string;
  }) {
    const entregadorDelegate = (prisma as any)?.entregador;

    const nome = String(input.nome || "").trim();
    const email = String(input.email || "").trim().toLowerCase();
    const emailAnterior = String(input.emailAnterior || "").trim().toLowerCase();

    if (!nome || !email) return;

    if (entregadorDelegate?.findFirst && entregadorDelegate?.update && entregadorDelegate?.create) {
      const existente = await entregadorDelegate.findFirst({
        where: {
          OR: [
            { email },
            ...(emailAnterior ? [{ email: emailAnterior }] : []),
          ],
        },
        select: { id: true },
      });

      if (existente?.id) {
        await entregadorDelegate.update({
          where: { id: existente.id },
          data: { nome, email, ativo: true },
        });
        return;
      }

      await entregadorDelegate.create({
        data: {
          nome,
          email,
          ativo: true,
        },
      });
      return;
    }

    const entregadorTable = await this.resolveEntregadorTableName();
    if (!entregadorTable) return;

    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT id
      FROM ${entregadorTable}
      WHERE LOWER(email) = ?
      LIMIT 1
      `,
      email,
    );

    const existenteId = rows[0]?.id ? String(rows[0].id) : null;
    if (existenteId) {
      await prisma.$executeRawUnsafe(
        `
        UPDATE ${entregadorTable}
        SET nome = ?, email = ?, ativo = 1
        WHERE id = ?
        `,
        nome,
        email,
        existenteId,
      );
      return;
    }

    if (emailAnterior) {
      const rowsEmailAntigo = await prisma.$queryRawUnsafe<Array<any>>(
        `
        SELECT id
        FROM ${entregadorTable}
        WHERE LOWER(email) = ?
        LIMIT 1
        `,
        emailAnterior,
      );

      const existenteEmailAntigoId = rowsEmailAntigo[0]?.id ? String(rowsEmailAntigo[0].id) : null;
      if (existenteEmailAntigoId) {
        await prisma.$executeRawUnsafe(
          `
          UPDATE ${entregadorTable}
          SET nome = ?, email = ?, ativo = 1
          WHERE id = ?
          `,
          nome,
          email,
          existenteEmailAntigoId,
        );
        return;
      }
    }

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO ${entregadorTable} (id, nome, email, ativo)
      VALUES (?, ?, ?, 1)
      `,
      crypto.randomUUID(),
      nome,
      email,
    );
  }

  async listarPerfisHierarquia() {
    const perfisCustomizados = await this.listarPerfisCustomizados();
    return {
      perfis: [...PERFIS_HIERARQUIA, ...perfisCustomizados].map((perfil) => ({
        ...perfil,
        origem: perfil.origem || "PADRAO",
      })),
      areasDisponiveis: AREAS_SISTEMA,
      roleBaseDisponiveis: [...ROLE_BASE_OPTIONS],
    };
  }

  async criarPerfilHierarquia(input: {
    nome: string;
    descricao: string;
    nivel: number;
    roleBase: string;
    areasPadrao?: string[];
    dadosPermitidosPadrao?: string[];
    autorUserId: string;
  }) {
    await this.ensureTables();

    const nome = String(input.nome || "").trim();
    const descricao = String(input.descricao || "").trim();
    const nivel = Number(input.nivel || 0);
    const roleBase = this.normalizeRoleBase(input.roleBase);

    if (!nome) throw new Error("nome_perfil_obrigatorio");
    if (!descricao) throw new Error("descricao_perfil_obrigatoria");
    if (!Number.isFinite(nivel) || nivel <= 0) throw new Error("nivel_perfil_invalido");

    if (nome.toLowerCase() === "entregador") {
      throw new Error("perfil_entregador_e_nativo");
    }

    const areasPadrao = roleBase === "ADMIN" ? ["*"] : this.normalizeAreas(input.areasPadrao || []);
    if (roleBase !== "ADMIN" && areasPadrao.length === 0) {
      throw new Error("areas_padrao_obrigatorias");
    }

    const dadosPermitidosPadrao = roleBase === "ADMIN"
      ? ["*"]
      : this.normalizeDadosPermitidos(input.dadosPermitidosPadrao || []);

    const id = `custom-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    try {
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO ${TABELA_PERFIL_HIERARQUIA}
        (id, nome, descricao, nivel, role_base, areas_json, dados_permitidos_json, created_by_user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        id,
        nome,
        descricao,
        nivel,
        roleBase,
        JSON.stringify(areasPadrao),
        JSON.stringify(dadosPermitidosPadrao.length > 0 ? dadosPermitidosPadrao : ["operacao-basica"]),
        input.autorUserId,
        new Date(),
        new Date(),
      );
    } catch (error: any) {
      if (String(error?.message || "").toLowerCase().includes("uk_perfil_hierarquia_nome")) {
        throw new Error("nome_perfil_ja_cadastrado");
      }
      throw error;
    }

    return {
      id,
      nome,
      descricao,
      nivel,
      roleBase,
      areasPadrao,
      dadosPermitidosPadrao: dadosPermitidosPadrao.length > 0 ? dadosPermitidosPadrao : ["operacao-basica"],
      origem: "CUSTOM" as const,
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

    const perfil = await this.resolverPerfilHierarquia(input.perfilId);
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

    if (this.perfilRepresentaEntregador(perfil)) {
      await this.sincronizarCadastroEntregador({
        nome: novoUsuario.nome,
        email: novoUsuario.email,
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
    const entregadorNativo = await this.usuarioTemPerfilEntregadorNativo(usuario.id);

    if (entregadorNativo && removidas.includes(AREA_RASTREIO_TRANSPORTE)) {
      throw new Error("perfil_entregador_exige_area_rastreio");
    }

    const mergedAreas = new Set<string>([...this.normalizeAreas(baseAreas), ...extras]);
    removidas.forEach((item) => mergedAreas.delete(item));
    if (entregadorNativo) mergedAreas.add(AREA_RASTREIO_TRANSPORTE);
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
    if (entregadorNativo && !dadosFinal.includes("rastreio")) {
      dadosFinal.push("rastreio");
    }

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

  async alterarCargoHierarquia(input: {
    userIdAlvo: string;
    perfilId: string;
    justificativa?: string;
    autorUserId: string;
  }) {
    await this.ensureTables();

    const usuario = await prisma.usuario.findUnique({
      where: { id: input.userIdAlvo },
      select: { id: true, nome: true, email: true, role: true },
    });

    if (!usuario) throw new Error("usuario_nao_encontrado");

    const perfil = await this.resolverPerfilHierarquia(input.perfilId);
    if (!perfil) throw new Error("perfil_hierarquico_invalido");

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { role: perfil.roleBase },
    });

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

    let acessoHierarquico: any = null;
    let areasPermitidas: string[] = [];
    let dadosPermitidos: string[] = [];

    if (perfil.roleBase === "ADMIN") {
      areasPermitidas = ["*"];
      dadosPermitidos = ["*"];
    } else {
      areasPermitidas = this.normalizeAreas(perfil.areasPadrao);
      dadosPermitidos = this.normalizeDadosPermitidos(perfil.dadosPermitidosPadrao);

      acessoHierarquico = await this.cadastrarAcesso({
        userIdAlvo: usuario.id,
        nomeAcesso: `perfil-hierarquia:${perfil.id}`,
        areasPermitidas,
        dadosPermitidos: dadosPermitidos.length > 0 ? dadosPermitidos : ["operacao-basica"],
        baseLegal: "execucao_de_contrato",
        finalidade: "mudanca_de_cargo_hierarquico",
        justificativa: input.justificativa || `Mudanca de cargo para ${perfil.nome}`,
        autorUserId: input.autorUserId,
      });
    }

    await this.registrarAuditoria({
      userId: usuario.id,
      acao: "CARGO_ALTERADO",
      detalhes: {
        roleAnterior: usuario.role,
        roleNovo: perfil.roleBase,
        perfilId: perfil.id,
        perfilNome: perfil.nome,
        justificativa: input.justificativa || null,
      },
      autorUserId: input.autorUserId,
    });

    if (this.perfilRepresentaEntregador(perfil)) {
      await this.sincronizarCadastroEntregador({
        nome: usuario.nome,
        email: usuario.email,
      });
    }

    return {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: perfil.roleBase,
      },
      perfil,
      areasPermitidas,
      dadosPermitidos,
      acessoHierarquico,
    };
  }

  async atualizarCadastroHierarquia(input: {
    userIdAlvo: string;
    nome?: string;
    email?: string;
    autorUserId: string;
  }) {
    await this.ensureTables();

    const usuario = await prisma.usuario.findUnique({
      where: { id: input.userIdAlvo },
      select: { id: true, nome: true, email: true, role: true },
    });

    if (!usuario) throw new Error("usuario_nao_encontrado");

    const nome = String(input.nome || usuario.nome).trim();
    const email = String(input.email || usuario.email).trim().toLowerCase();

    if (!nome) throw new Error("nome_obrigatorio");
    if (!email) throw new Error("email_obrigatorio");

    const emailExistente = await prisma.usuario.findFirst({
      where: {
        email,
        NOT: { id: usuario.id },
      },
      select: { id: true },
    });

    if (emailExistente) throw new Error("email_ja_cadastrado");

    const atualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: { nome, email },
      select: { id: true, nome: true, email: true, role: true, createdAt: true },
    });

    await this.sincronizarCadastroEntregador({
      nome,
      email,
      emailAnterior: usuario.email,
    });

    await this.registrarAuditoria({
      userId: usuario.id,
      acao: "CADASTRO_ATUALIZADO",
      detalhes: {
        nomeAnterior: usuario.nome,
        nomeNovo: nome,
        emailAnterior: usuario.email,
        emailNovo: email,
      },
      autorUserId: input.autorUserId,
    });

    return { usuario: atualizado };
  }

  async listarFuncionariosHierarquia() {
    await this.ensureTables();
    await this.repararConsistenciaEntregadorNativo();

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
      areasPermitidas: parseStoredStringList(row.areas_json),
      restricoes: parseStoredObject(row.restricoes_json),
      dadosPermitidos: parseStoredStringList(row.dados_permitidos_json),
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
      areasPermitidas: parseStoredStringList(row.areas_json),
      dadosPermitidos: parseStoredStringList(row.dados_permitidos_json),
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
      detalhes: parseStoredObject(row.detalhes_json),
      autorUserId: row.autor_user_id,
      createdAt: row.created_at,
    }));
  }

  async validarAcessoArea(userId: string, role: string | undefined, area: string) {
    if (!userId) return false;
    const normalizedArea = sanitizeArea(area);
    const areasPermitidas = await this.listarAreasPermitidas(userId, role);
    return areasPermitidas.includes("*") || areasPermitidas.includes(normalizedArea);
  }

  async listarAreasPermitidas(userId: string, role?: string) {
    if (role === "ADMIN") return ["*"];

    const acessos = await this.listarAcessosPorUsuario(userId);
    const now = Date.now();

    const acessosAtivos = acessos.filter((item) => {
      if (item.status !== "ATIVO") return false;
      if (!item.expiraEm) return true;
      const expiresAt = new Date(item.expiraEm).getTime();
      return expiresAt > now;
    });

    const acessoHierarquicoAtivo = acessosAtivos.find((item) => item.nomeAcesso.startsWith("perfil-hierarquia:"));

    const areas = new Set<string>(
      acessoHierarquicoAtivo
        ? (acessoHierarquicoAtivo.areasPermitidas || [])
        : this.getAreasPadraoPorRole(role)
    );

    acessosAtivos
      .filter((item) => !item.nomeAcesso.startsWith("perfil-hierarquia:"))
      .forEach((item) => {
        (item.areasPermitidas || []).forEach((area: string) => areas.add(area));
      });

    return Array.from(areas);
  }
}

const acessosService = new AcessosService();
export default acessosService;
