import crypto from "crypto";
import prisma from "../database/prisma";

const TABELA_LOGIN_AUDITORIA = "auth_login_auditoria";

type LoginAttemptInput = {
  email: string;
  usuarioId?: string;
  ip?: string;
  userAgent?: string;
  motivo: string;
};

class LoginSecurityService {
  private _tablesReady = false;

  async init() {
    await this.ensureTables();
  }

  private async ensureTables() {
    if (this._tablesReady) return;
    this._tablesReady = true;
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${TABELA_LOGIN_AUDITORIA} (
        id VARCHAR(191) PRIMARY KEY,
        email VARCHAR(191) NOT NULL,
        usuario_id VARCHAR(191) NULL,
        sucesso BOOLEAN NOT NULL,
        motivo VARCHAR(120) NOT NULL,
        ip VARCHAR(120) NULL,
        user_agent VARCHAR(255) NULL,
        bloqueado_ate DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL,
        INDEX idx_login_email_data (email, created_at),
        INDEX idx_login_bloqueio (bloqueado_ate),
        INDEX idx_login_sucesso_data (sucesso, created_at)
      )
    `);
  }

  private normalizeEmail(emailInput: string) {
    return String(emailInput || "").trim().toLowerCase();
  }

  private now() {
    return new Date();
  }

  private getBaseAttempts() {
    const parsed = Number(process.env.LOGIN_MAX_ATTEMPTS_BASE || 5);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
  }

  private getFailureWindowMinutes() {
    const parsed = Number(process.env.LOGIN_FAILURE_WINDOW_MINUTES || 30);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
  }

  private getBlockBaseMinutes() {
    const parsed = Number(process.env.LOGIN_BLOCK_MINUTES_BASE || 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
  }

  private getBlockMultiplier() {
    const parsed = Number(process.env.LOGIN_BLOCK_MULTIPLIER || 2);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 2;
  }

  private getBlockMaxMinutes() {
    const parsed = Number(process.env.LOGIN_BLOCK_MAX_MINUTES || 120);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 120;
  }

  private truncateUserAgent(userAgent?: string) {
    if (!userAgent) return null;
    return String(userAgent).slice(0, 255);
  }

  private calcBlockedUntil(failuresInWindow: number) {
    const baseAttempts = this.getBaseAttempts();
    if (failuresInWindow < baseAttempts) return null;

    const phase = Math.floor((failuresInWindow - baseAttempts) / baseAttempts) + 1;
    const baseMinutes = this.getBlockBaseMinutes();
    const multiplier = this.getBlockMultiplier();
    const maxMinutes = this.getBlockMaxMinutes();

    const blockMinutes = Math.min(baseMinutes * Math.pow(multiplier, phase - 1), maxMinutes);
    const blockedUntil = new Date(this.now().getTime() + blockMinutes * 60 * 1000);

    return { blockedUntil, blockMinutes };
  }

  private async countFailuresInWindow(email: string) {
    const now = this.now();
    const windowMinutes = this.getFailureWindowMinutes();

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT COUNT(*) AS total
      FROM ${TABELA_LOGIN_AUDITORIA}
      WHERE email = ?
        AND sucesso = 0
        AND created_at >= DATE_SUB(?, INTERVAL ? MINUTE)
      `,
      email,
      now,
      windowMinutes
    );

    return Number(rows?.[0]?.total || 0);
  }

  async assertNotBlocked(emailInput: string) {
    await this.ensureTables();
    const email = this.normalizeEmail(emailInput);
    if (!email) return;

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT bloqueado_ate
      FROM ${TABELA_LOGIN_AUDITORIA}
      WHERE email = ?
        AND bloqueado_ate IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
      `,
      email
    );

    if (!rows.length || !rows[0].bloqueado_ate) return;

    const blockedUntil = new Date(rows[0].bloqueado_ate);
    const now = this.now();

    if (blockedUntil.getTime() <= now.getTime()) return;

    const remainingSeconds = Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000);
    const error = new Error("login_temporariamente_bloqueado");
    (error as any).remainingSeconds = remainingSeconds;
    throw error;
  }

  async registerFailure(input: LoginAttemptInput) {
    await this.ensureTables();

    const email = this.normalizeEmail(input.email);
    if (!email) return;

    const failuresInWindow = (await this.countFailuresInWindow(email)) + 1;
    const block = this.calcBlockedUntil(failuresInWindow);

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO ${TABELA_LOGIN_AUDITORIA}
      (id, email, usuario_id, sucesso, motivo, ip, user_agent, bloqueado_ate, created_at)
      VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)
      `,
      crypto.randomUUID(),
      email,
      input.usuarioId || null,
      input.motivo,
      input.ip || null,
      this.truncateUserAgent(input.userAgent),
      block?.blockedUntil || null,
      this.now()
    );

    return {
      blocked: Boolean(block?.blockedUntil),
      blockedUntil: block?.blockedUntil || null,
      blockMinutes: block?.blockMinutes || 0,
      failuresInWindow,
    };
  }

  async registerSuccess(input: Omit<LoginAttemptInput, "motivo">) {
    await this.ensureTables();

    const email = this.normalizeEmail(input.email);
    if (!email) return;

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO ${TABELA_LOGIN_AUDITORIA}
      (id, email, usuario_id, sucesso, motivo, ip, user_agent, bloqueado_ate, created_at)
      VALUES (?, ?, ?, 1, 'login_sucesso', ?, ?, NULL, ?)
      `,
      crypto.randomUUID(),
      email,
      input.usuarioId || null,
      input.ip || null,
      this.truncateUserAgent(input.userAgent),
      this.now()
    );
  }
}

const loginSecurityService = new LoginSecurityService();

export default loginSecurityService;
