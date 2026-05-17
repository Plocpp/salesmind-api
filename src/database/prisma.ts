import { PrismaClient } from "@prisma/client";

// Parâmetros de pool/timeout configuráveis por variável de ambiente.
// Em produção no Render (MySQL remoto) é importante limitar conexões e definir
// connection_timeout para não bloquear indefinidamente quando o DB oscila.
//
// Variáveis relevantes no .env / Render:
//   PRISMA_CONNECTION_LIMIT   — máx. de conexões do pool (padrão: 5)
//   PRISMA_CONNECT_TIMEOUT    — segundos até desistir de conectar (padrão: 10)
//   PRISMA_POOL_TIMEOUT       — segundos de espera por conexão livre (padrão: 15)

function buildDatasourceUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;

  try {
    const url = new URL(base);
    const connLimit   = process.env.PRISMA_CONNECTION_LIMIT   || "5";
    const connTimeout = process.env.PRISMA_CONNECT_TIMEOUT    || "10";
    const poolTimeout = process.env.PRISMA_POOL_TIMEOUT       || "15";

    url.searchParams.set("connection_limit",   connLimit);
    url.searchParams.set("connect_timeout",    connTimeout);
    url.searchParams.set("pool_timeout",       poolTimeout);

    return url.toString();
  } catch {
    // URL inválida — deixa o Prisma falhar com mensagem clara
    return base;
  }
}

const datasourceUrl = buildDatasourceUrl();

const prisma = new PrismaClient({
  ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
});

export default prisma;
