const DEFAULT_API_BASE_URL = 'https://salesmind-api.onrender.com';
const DEFAULT_APP_BASE_URL = 'https://salesmind-app.onrender.com';

const apiBaseUrl = String(process.env.API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');
const appBaseUrl = String(process.env.APP_BASE_URL || DEFAULT_APP_BASE_URL).replace(/\/$/, '');
const maxAttempts = Number(process.env.POST_DEPLOY_MAX_ATTEMPTS || 20);
const retryDelayMs = Number(process.env.POST_DEPLOY_RETRY_DELAY_MS || 15000);
const alertWebhookUrl = process.env.ALERT_WEBHOOK_URL || '';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestText(url) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json,text/plain,*/*' },
  });

  const text = await res.text();
  return { status: res.status, text };
}

async function checkHealth() {
  const url = `${apiBaseUrl}/health`;
  const { status, text } = await requestText(url);
  let parsed = null;

  try {
    parsed = JSON.parse(text);
  } catch (_error) {
    parsed = null;
  }

  const ok = status === 200 && parsed && parsed.success === true;
  return {
    name: 'api-health',
    url,
    ok,
    status,
    info: parsed || text,
  };
}

async function checkDiagnostico() {
  const url = `${apiBaseUrl}/diagnostico/saude`;
  const { status, text } = await requestText(url);
  const ok = status === 200;
  return {
    name: 'api-diagnostico',
    url,
    ok,
    status,
    info: ok ? 'ok' : text,
  };
}

async function checkHierarquiaProtection() {
  const url = `${apiBaseUrl}/acessos/hierarquia/perfis`;
  const { status, text } = await requestText(url);
  const ok = status === 401 || status === 403;
  return {
    name: 'api-hierarquia-protection',
    url,
    ok,
    status,
    info: text,
  };
}

async function checkFrontend() {
  const url = appBaseUrl;
  const { status, text } = await requestText(url);
  const ok = status === 200 && /Salesmind/i.test(text);
  return {
    name: 'app-home',
    url,
    ok,
    status,
    info: ok ? 'ok' : text.slice(0, 300),
  };
}

async function runChecks() {
  const checks = await Promise.all([
    checkHealth(),
    checkDiagnostico(),
    checkHierarquiaProtection(),
    checkFrontend(),
  ]);

  return {
    ok: checks.every((item) => item.ok),
    checks,
  };
}

async function sendAlert(payload) {
  if (!alertWebhookUrl) return;

  try {
    await fetch(alertWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('[post-deploy-check] Falha ao enviar alerta:', error.message);
  }
}

async function main() {
  const startedAt = new Date().toISOString();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await runChecks();
    const report = {
      startedAt,
      checkedAt: new Date().toISOString(),
      attempt,
      maxAttempts,
      ok: result.ok,
      apiBaseUrl,
      appBaseUrl,
      checks: result.checks,
    };

    console.log(JSON.stringify(report, null, 2));

    if (result.ok) {
      process.exit(0);
    }

    if (attempt < maxAttempts) {
      await sleep(retryDelayMs);
      continue;
    }

    await sendAlert({
      event: 'post-deploy-check-failed',
      ...report,
    });

    process.exit(1);
  }
}

main().catch(async (error) => {
  const payload = {
    event: 'post-deploy-check-error',
    checkedAt: new Date().toISOString(),
    apiBaseUrl,
    appBaseUrl,
    error: error.message,
  };

  console.error(JSON.stringify(payload, null, 2));
  await sendAlert(payload);
  process.exit(1);
});
