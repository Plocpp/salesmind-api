import { PrismaClient } from "@prisma/client";

// Parâmetros de pool/timeout configuráveis por variável de ambiente.
// Em produção no Render (MySQL remoto) é importante limitar conexões e definir
// connection_timeout para não bloquear indefinidamente quando o DB oscila.
//
// Variáveis relevantes no .env / Render:
//   PRISMA_CONNECTION_LIMIT   - max. de conexões do pool (padrão: 5)
//   PRISMA_CONNECT_TIMEOUT    - segundos até desistir de conectar (padrão: 10)
//   PRISMA_POOL_TIMEOUT       - segundos de espera por conexão livre (padrão: 15)
//
// Para ambiente Railway + execução fora da rede interna, suporte também:
//   DATABASE_URL_PUBLIC / DATABASE_PUBLIC_URL / MYSQL_PUBLIC_URL

function firstNonEmpty(vars: string[]): string | undefined {
  for (const key of vars) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

function buildUrlFromMysqlParts(): string | undefined {
  const host = process.env.MYSQLHOST?.trim();
  const port = process.env.MYSQLPORT?.trim() || "3306";
  const database = process.env.MYSQLDATABASE?.trim();
  const user = process.env.MYSQLUSER?.trim();
  const password = process.env.MYSQLPASSWORD?.trim();

  if (!host || !database || !user || !password) return undefined;

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `mysql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
}

function pickBaseDatabaseUrl(): string | undefined {
  const primary = process.env.DATABASE_URL?.trim();
  const publicCandidate = firstNonEmpty([
    "DATABASE_URL_PUBLIC",
    "DATABASE_PUBLIC_URL",
    "MYSQL_PUBLIC_URL",
  ]);

  if (!primary) {
    return publicCandidate || buildUrlFromMysqlParts();
  }

  try {
    const url = new URL(primary);
    const isRailwayInternalHost = url.hostname.endsWith(".railway.internal");

    if (isRailwayInternalHost && publicCandidate) {
      console.warn(
        `[prisma] DATABASE_URL usa host interno (${url.hostname}); usando URL publica alternativa.`
      );
      return publicCandidate;
    }
  } catch {
    // Se a URL principal for inválida, deixa o Prisma reportar erro com contexto.
  }

  return primary;
}

function buildDatasourceUrl(): string | undefined {
  const base = pickBaseDatabaseUrl();
  if (!base) return undefined;

  try {
    const url = new URL(base);
    const connLimit = process.env.PRISMA_CONNECTION_LIMIT || "5";
    const connTimeout = process.env.PRISMA_CONNECT_TIMEOUT || "10";
    const poolTimeout = process.env.PRISMA_POOL_TIMEOUT || "15";

    url.searchParams.set("connection_limit", connLimit);
    url.searchParams.set("connect_timeout", connTimeout);
    url.searchParams.set("pool_timeout", poolTimeout);

    return url.toString();
  } catch {
    // URL inválida - deixa o Prisma falhar com mensagem clara
    return base;
  }
}

const datasourceUrl = buildDatasourceUrl();

const prisma = new PrismaClient({
  ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
});

export default prisma;
