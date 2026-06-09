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

function validarConfiguracaoAmbiente(): void {
  const onboardingWebhookToken = String(process.env.ONBOARDING_WEBHOOK_TOKEN || "").trim();
  const phoneMockMode = String(process.env.PHONE_MOCK_MODE ?? "true").toLowerCase() === "true";
  const twilioSid = String(process.env.TWILIO_ACCOUNT_SID || "").trim();
  const twilioToken = String(process.env.TWILIO_AUTH_TOKEN || "").trim();
  const twilioSmsFrom = String(process.env.TWILIO_SMS_FROM || "").trim();
  const twilioWhatsappFrom = String(process.env.TWILIO_WHATSAPP_FROM || "").trim();

  if (!onboardingWebhookToken) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ONBOARDING_WEBHOOK_TOKEN_nao_configurado");
    }
    console.warn("[startup] AVISO: ONBOARDING_WEBHOOK_TOKEN não está configurado. Webhooks de pagamento serão rejeitados.");
  }

  if (!phoneMockMode) {
    if (!twilioSid || !twilioToken) {
      throw new Error("TWILIO_CREDENTIALS_INCOMPLETAS");
    }
    if (!twilioSmsFrom || !twilioWhatsappFrom) {
      throw new Error("TWILIO_FROM_INCOMPLETO");
    }
  } else {
    if (!twilioSid || !twilioToken || !twilioSmsFrom || !twilioWhatsappFrom) {
      console.warn(
        "[startup] AVISO: PHONE_MOCK_MODE=true e as variáveis Twilio não estão todas configuradas. " +
        "O sistema continuará em modo mock para envios de SMS/WhatsApp."
      );
    }
  }
}

export async function runStartup(): Promise<void> {
  validarConfiguracaoAmbiente();

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
