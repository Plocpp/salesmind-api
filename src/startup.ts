/**
 * Inicialização centralizada do backend.
 * Chamado uma vez antes do servidor aceitar conexões.
 * - Verifica conectividade com o banco de dados
 * - Cria tabelas runtime (acesso, auditoria, onboarding, login-security)
 *   de forma que as requests nunca precisem fazer isso sob demanda
 */

import prisma from "./database/prisma";
import acessosService from "./services/acessos.service";
import loginSecurityService from "./services/login-security.service";
import onboardingAcessoService from "./services/onboarding-acesso.service";
import onboardingPagamentoService from "./services/onboarding-pagamento.service";

const DB_CONNECT_TIMEOUT_MS = 10_000;

async function verificarDB(): Promise<void> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Timeout ao conectar ao banco de dados")), DB_CONNECT_TIMEOUT_MS)
  );
  const ping = prisma.$queryRaw`SELECT 1`;
  await Promise.race([ping, timeout]);
}

export async function runStartup(): Promise<void> {
  console.log("[startup] Verificando conexão com o banco de dados...");
  await verificarDB();
  console.log("[startup] Banco de dados acessível.");

  console.log("[startup] Criando tabelas runtime...");
  await Promise.all([
    loginSecurityService.init(),
    acessosService.init(),
    onboardingAcessoService.init(),
    onboardingPagamentoService.init(),
  ]);
  console.log("[startup] Tabelas runtime prontas.");
}
