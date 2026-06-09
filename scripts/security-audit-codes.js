const { PrismaClient } = require('@prisma/client');

function firstNonEmpty(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value && String(value).trim()) return String(value).trim();
  }
  return undefined;
}

function buildUrlFromMysqlParts() {
  const host = process.env.MYSQLHOST && process.env.MYSQLHOST.trim();
  const port = (process.env.MYSQLPORT && process.env.MYSQLPORT.trim()) || '3306';
  const database = process.env.MYSQLDATABASE && process.env.MYSQLDATABASE.trim();
  const user = process.env.MYSQLUSER && process.env.MYSQLUSER.trim();
  const password = process.env.MYSQLPASSWORD && process.env.MYSQLPASSWORD.trim();

  if (!host || !database || !user || !password) return undefined;

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `mysql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
}

function resolveDatabaseUrl() {
  const primary = process.env.DATABASE_URL && process.env.DATABASE_URL.trim();
  const publicCandidate = firstNonEmpty([
    'DATABASE_URL_PUBLIC',
    'DATABASE_PUBLIC_URL',
    'MYSQL_PUBLIC_URL',
  ]);

  if (!primary) return publicCandidate || buildUrlFromMysqlParts();

  try {
    const url = new URL(primary);
    if (url.hostname.endsWith('.railway.internal') && publicCandidate) {
      return publicCandidate;
    }
  } catch {
    return primary;
  }

  return primary;
}

function buildDatasourceUrl() {
  const base = resolveDatabaseUrl();
  if (!base) return undefined;

  try {
    const url = new URL(base);
    url.searchParams.set('connection_limit', process.env.PRISMA_CONNECTION_LIMIT || '5');
    url.searchParams.set('connect_timeout', process.env.PRISMA_CONNECT_TIMEOUT || '10');
    url.searchParams.set('pool_timeout', process.env.PRISMA_POOL_TIMEOUT || '15');
    return url.toString();
  } catch {
    return base;
  }
}

function parseArg(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  if (!raw) return fallback;
  const value = Number(raw.slice(prefix.length));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseBooleanEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return String(raw).toLowerCase() === 'true';
}

function parseBooleanArg(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  if (!raw) return fallback;
  return String(raw.slice(prefix.length)).toLowerCase() === 'true';
}

function parseTableNotFound(error) {
  const message = String(error && error.message ? error.message : '');
  return message.includes("doesn't exist") || message.includes('Table') || message.includes('1146');
}

async function queryAuditTable(prisma, tableName, sinceDate) {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT evento, COUNT(*) AS total
      FROM ${tableName}
      WHERE created_at >= ?
      GROUP BY evento
      ORDER BY total DESC
      `,
      sinceDate
    );

    const normalized = Array.isArray(rows)
      ? rows.map((row) => ({
          evento: String(row.evento || ''),
          total: Number(row.total || 0),
        }))
      : [];

    return { missing: false, rows: normalized };
  } catch (error) {
    if (parseTableNotFound(error)) {
      return { missing: true, rows: [] };
    }
    throw error;
  }
}

function sumByPrefix(rows, prefixes) {
  return rows
    .filter((item) => prefixes.some((prefix) => item.evento.startsWith(prefix)))
    .reduce((acc, item) => acc + item.total, 0);
}

async function main() {
  const hours = parseArg('hours', Number(process.env.SECURITY_AUDIT_WINDOW_HOURS || 24));
  const invalidThreshold = parseArg('invalid-threshold', Number(process.env.SECURITY_AUDIT_INVALID_THRESHOLD || 20));
  const blockedThreshold = parseArg('blocked-threshold', Number(process.env.SECURITY_AUDIT_BLOCKED_THRESHOLD || 5));
  const strictMissingTables = parseBooleanArg(
    'strict-missing-tables',
    parseBooleanEnv('SECURITY_AUDIT_STRICT_TABLES', false)
  );

  const datasourceUrl = buildDatasourceUrl();
  const prisma = new PrismaClient(
    datasourceUrl
      ? {
          datasources: {
            db: {
              url: datasourceUrl,
            },
          },
        }
      : {}
  );

  const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000);

  try {
    const onboarding = await queryAuditTable(prisma, 'saas_codigo_acesso_auditoria', sinceDate);
    const rastreio = await queryAuditTable(prisma, 'rastreio_ativacao_mobile_auditoria', sinceDate);

    const onboardingInvalid = sumByPrefix(onboarding.rows, ['CODIGO_INVALIDO_', 'CODIGO_FORMATO_INVALIDO']);
    const onboardingBlocked = sumByPrefix(onboarding.rows, ['CODIGO_BLOQUEADO_']);
    const rastreioInvalid = sumByPrefix(rastreio.rows, ['CODIGO_ATIVACAO_INVALIDO_']);
    const rastreioBlocked = sumByPrefix(rastreio.rows, ['CODIGO_ATIVACAO_BLOQUEADO_']);

    const findings = [];

    if (onboarding.missing) findings.push('table_missing:saas_codigo_acesso_auditoria');
    if (rastreio.missing) findings.push('table_missing:rastreio_ativacao_mobile_auditoria');

    if (onboardingInvalid > invalidThreshold) {
      findings.push(`onboarding_invalid_high:${onboardingInvalid}`);
    }
    if (onboardingBlocked > blockedThreshold) {
      findings.push(`onboarding_blocked_high:${onboardingBlocked}`);
    }
    if (rastreioInvalid > invalidThreshold) {
      findings.push(`rastreio_invalid_high:${rastreioInvalid}`);
    }
    if (rastreioBlocked > blockedThreshold) {
      findings.push(`rastreio_blocked_high:${rastreioBlocked}`);
    }

    const report = {
      checkedAt: new Date().toISOString(),
      windowHours: hours,
      thresholds: {
        invalid: invalidThreshold,
        blocked: blockedThreshold,
      },
      strictMissingTables,
      tables: {
        saas_codigo_acesso_auditoria: {
          missing: onboarding.missing,
          events: onboarding.rows,
          invalidCount: onboardingInvalid,
          blockedCount: onboardingBlocked,
        },
        rastreio_ativacao_mobile_auditoria: {
          missing: rastreio.missing,
          events: rastreio.rows,
          invalidCount: rastreioInvalid,
          blockedCount: rastreioBlocked,
        },
      },
      findings,
      ok: strictMissingTables ? findings.length === 0 : findings.filter((item) => !item.startsWith('table_missing:')).length === 0,
    };

    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.ok ? 0 : 1;
  } catch (error) {
    const failure = {
      checkedAt: new Date().toISOString(),
      ok: false,
      error: error && error.message ? error.message : String(error),
    };
    console.error(JSON.stringify(failure, null, 2));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
