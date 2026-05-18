import "dotenv/config";
import http from "http";
import app from "./app";
import prisma from "./database/prisma";
import { runStartup } from "./startup";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const host = process.env.HOST || "0.0.0.0";
const startupRetryDelayMs = Number(process.env.STARTUP_RETRY_DELAY_MS || 15000);

// ── Handlers globais ──────────────────────────────────────────────────────────
// Evitam que o processo caia silenciosamente por promise não tratada ou
// exceção síncrona fora de um try/catch.

process.on("unhandledRejection", (reason: unknown) => {
  console.error("[server] unhandledRejection:", reason);
  // Não encerra o processo — apenas loga para não derrubar o servidor por
  // erros pontuais (ex.: timeout de e-mail mock).
});

process.on("uncaughtException", (err: Error) => {
  console.error("[server] uncaughtException:", err);
  // Erros síncronos inesperados são mais graves; inicia shutdown limpo.
  gracefulShutdown("uncaughtException").finally(() => process.exit(1));
});

// ── Rotas básicas ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ message: "SalesMind API rodando 🚀" });
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
let httpServer: http.Server;
let shutdownInProgress = false;

async function runStartupWithRetry(): Promise<void> {
  let attempt = 0;

  while (!shutdownInProgress) {
    attempt += 1;
    try {
      await runStartup();
      console.log("[server] Inicializacao de runtime concluida.");
      return;
    } catch (err) {
      console.error(`[server] Falha na inicializacao (tentativa ${attempt}):`, err);
      console.log(`[server] Nova tentativa em ${startupRetryDelayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, startupRetryDelayMs));
    }
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  if (shutdownInProgress) return;
  shutdownInProgress = true;

  console.log(`[server] ${signal} recebido — encerrando servidor...`);

  await new Promise<void>((resolve) => {
    if (!httpServer) return resolve();
    // Para de aceitar novas conexões; aguarda requests em andamento (máx 10s)
    httpServer.close(() => resolve());
    setTimeout(() => resolve(), 10_000);
  });

  try {
    await prisma.$disconnect();
    console.log("[server] Prisma desconectado.");
  } catch (err) {
    console.error("[server] Erro ao desconectar Prisma:", err);
  }

  console.log("[server] Shutdown concluído.");
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM").finally(() => process.exit(0)));
process.on("SIGINT",  () => gracefulShutdown("SIGINT").finally(() => process.exit(0)));

// ── Boot ──────────────────────────────────────────────────────────────────────
async function boot(): Promise<void> {
  httpServer = app.listen(port, host, () => {
    console.log(`[server] Servidor rodando em ${host}:${port}`);
  });

  // Inicializacao do banco e tabelas runtime em background com retentativa,
  // para nao derrubar o processo durante flutuacoes de rede no boot.
  void runStartupWithRetry();
}

boot();
