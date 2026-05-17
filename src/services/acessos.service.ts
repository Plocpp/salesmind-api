import crypto from "crypto";
import prisma from "../database/prisma";

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

const sanitizeArea = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_.]/g, "");

class AcessosService {
  private _tablesReady = false;

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

    await this.ensureTables();

    const normalizedArea = sanitizeArea(area);
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

    const areas = new Set<string>();
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
