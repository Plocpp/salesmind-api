const axios = require('axios');

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const SMOKE_USER_EMAIL = process.env.SMOKE_USER_EMAIL || 'admin@test.com';
const SMOKE_USER_PASSWORD = process.env.SMOKE_USER_PASSWORD || '123456';

function nowIso() {
  return new Date().toISOString();
}

function createClient(token) {
  return axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

async function runStep(moduleName, stepName, fn) {
  const startedAt = Date.now();
  try {
    const payload = await fn();
    return {
      ...(payload || {}),
      module: moduleName,
      step: stepName,
      ok: true,
      durationMs: Date.now() - startedAt,
      status: payload && payload.status ? payload.status : null,
      info: payload && payload.info ? payload.info : null,
    };
  } catch (error) {
    const responseStatus = error.response ? error.response.status : null;
    const responseData = error.response ? error.response.data : null;
    return {
      module: moduleName,
      step: stepName,
      ok: false,
      durationMs: Date.now() - startedAt,
      status: responseStatus,
      info: responseData || error.message || String(error),
    };
  }
}

function summarize(results) {
  const byModule = new Map();

  for (const result of results) {
    if (!byModule.has(result.module)) {
      byModule.set(result.module, { total: 0, ok: 0, fail: 0 });
    }

    const agg = byModule.get(result.module);
    agg.total += 1;
    if (result.ok) agg.ok += 1;
    else agg.fail += 1;
  }

  return byModule;
}

(async () => {
  const startedAt = Date.now();
  const results = [];

  const publicClient = createClient(null);

  results.push(
    await runStep('Infra', 'GET /health', async () => {
      const res = await publicClient.get('/health');
      return { status: res.status, info: res.data && res.data.status };
    })
  );

  results.push(
    await runStep('Diagnostico', 'GET /diagnostico/saude', async () => {
      const res = await publicClient.get('/diagnostico/saude');
      return { status: res.status, info: res.data && res.data.status };
    })
  );

  const loginResult = await runStep('Auth', 'POST /auth/login', async () => {
    const res = await publicClient.post('/auth/login', {
      email: SMOKE_USER_EMAIL,
      senha: SMOKE_USER_PASSWORD,
    });

    return {
      status: res.status,
      info: {
        role: res.data && (res.data.role || null),
        hasAccessToken: Boolean(res.data && res.data.accessToken),
      },
      accessToken: res.data ? res.data.accessToken : null,
      refreshToken: res.data ? res.data.refreshToken : null,
    };
  });

  results.push(loginResult);

  if (!loginResult.ok || !loginResult.info || !loginResult.info.hasAccessToken) {
    console.log(JSON.stringify({
      startedAt: nowIso(),
      finishedAt: nowIso(),
      durationMs: Date.now() - startedAt,
      results,
      message: 'Falha no login. Abortando smoke test autenticado.',
    }, null, 2));
    process.exit(1);
  }

  const token = loginResult.accessToken;
  const authClient = createClient(token);

  results.push(
    await runStep('Auth', 'GET /auth/me', async () => {
      const res = await authClient.get('/auth/me');
      return { status: res.status, info: { userId: res.data && res.data.id ? res.data.id : null } };
    })
  );

  if (loginResult.refreshToken) {
    results.push(
      await runStep('Auth', 'POST /auth/refresh', async () => {
        const res = await publicClient.post('/auth/refresh', { refreshToken: loginResult.refreshToken });
        return {
          status: res.status,
          info: { refreshed: Boolean(res.data && res.data.accessToken) },
        };
      })
    );
  }

  const moduleSteps = [
    ['Acessos', 'GET /acessos/me', () => authClient.get('/acessos/me')],
    ['Acessos', 'GET /acessos', () => authClient.get('/acessos')],

    ['Produtos', 'GET /produtos?limit=50', () => authClient.get('/produtos?limit=50')],
    ['Produtos', 'GET /produtos/admin/dashboard', () => authClient.get('/produtos/admin/dashboard')],

    ['Cadastros', 'GET /cadastros/fornecedores', () => authClient.get('/cadastros/fornecedores')],
    ['Cadastros', 'GET /cadastros/marcas', () => authClient.get('/cadastros/marcas')],
    ['Cadastros', 'GET /cadastros/produtos', () => authClient.get('/cadastros/produtos')],
    ['Cadastros', 'GET /cadastros/clientes', () => authClient.get('/cadastros/clientes')],

    ['Vendas', 'GET /vendas/vendas', () => authClient.get('/vendas/vendas')],
    ['Vendas', 'GET /vendas/caixas', () => authClient.get('/vendas/caixas')],
    ['Vendas', 'GET /vendas/movimentos-caixa', () => authClient.get('/vendas/movimentos-caixa')],
    ['Vendas', 'GET /vendas/clientes/ranking', () => authClient.get('/vendas/clientes/ranking')],
    ['Vendas', 'GET /vendas/clientes/saldos', () => authClient.get('/vendas/clientes/saldos')],
    ['Vendas', 'GET /vendas/listas-preco', () => authClient.get('/vendas/listas-preco')],
    ['Vendas', 'GET /vendas/formas-recebimento', () => authClient.get('/vendas/formas-recebimento')],
    ['Vendas', 'GET /vendas/orcamentos', () => authClient.get('/vendas/orcamentos')],
    ['Vendas', 'GET /vendas/modelo-demonstrativo?periodoDias=30', () => authClient.get('/vendas/modelo-demonstrativo?periodoDias=30')],
    ['Vendas', 'GET /vendas/configuracao', () => authClient.get('/vendas/configuracao')],
    ['Vendas', 'GET /vendas/dashboard', () => authClient.get('/vendas/dashboard')],

    ['Financeiro', 'GET /financeiro/lancamentos', () => authClient.get('/financeiro/lancamentos')],
    ['Financeiro', 'GET /financeiro/contas', () => authClient.get('/financeiro/contas')],
    ['Financeiro', 'GET /financeiro/categorias', () => authClient.get('/financeiro/categorias')],
    ['Financeiro', 'GET /financeiro/formas-pagamento', () => authClient.get('/financeiro/formas-pagamento')],
    ['Financeiro', 'GET /financeiro/demonstrativo', () => authClient.get('/financeiro/demonstrativo')],
    ['Financeiro', 'GET /financeiro/fluxo-caixa', () => authClient.get('/financeiro/fluxo-caixa')],

    ['Estoque', 'GET /estoque/grupos', () => authClient.get('/estoque/grupos')],
    ['Estoque', 'GET /estoque/depositos', () => authClient.get('/estoque/depositos')],
    ['Estoque', 'GET /estoque/saldos', () => authClient.get('/estoque/saldos')],
    ['Estoque', 'GET /estoque/analise', () => authClient.get('/estoque/analise')],
    ['Estoque', 'GET /estoque/compras/pedidos', () => authClient.get('/estoque/compras/pedidos')],

    ['Integracoes', 'GET /integracoes/status', () => authClient.get('/integracoes/status')],
    ['Integracoes', 'GET /integracoes/providers', () => authClient.get('/integracoes/providers')],
    ['Integracoes', 'GET /integracoes/accounts', () => authClient.get('/integracoes/accounts')],
    ['Integracoes', 'GET /integracoes/webhooks/templates', () => authClient.get('/integracoes/webhooks/templates')],

    ['Onboarding', 'GET /onboarding/planos', () => publicClient.get('/onboarding/planos')],
    ['Onboarding', 'GET /onboarding/preferencias', () => publicClient.get('/onboarding/preferencias')],

    ['Diagnostico', 'GET /diagnostico/erros', () => authClient.get('/diagnostico/erros')],
    ['Diagnostico', 'GET /diagnostico/relatorio', () => authClient.get('/diagnostico/relatorio')],
  ];

  for (const [moduleName, stepName, fn] of moduleSteps) {
    results.push(
      await runStep(moduleName, stepName, async () => {
        const res = await fn();
        return { status: res.status, info: null };
      })
    );
  }

  results.push(
    await runStep('Auth', 'POST /auth/logout', async () => {
      const res = await authClient.post('/auth/logout');
      return { status: res.status, info: null };
    })
  );

  const total = results.length;
  const ok = results.filter((item) => item.ok).length;
  const fail = total - ok;

  const modules = summarize(results);
  const modulesSummary = Array.from(modules.entries()).map(([module, value]) => ({ module, ...value }));

  const report = {
    startedAt: nowIso(),
    finishedAt: nowIso(),
    durationMs: Date.now() - startedAt,
    baseUrl: BASE_URL,
    total,
    ok,
    fail,
    modules: modulesSummary,
    failedSteps: results.filter((item) => !item.ok),
  };

  console.log(JSON.stringify(report, null, 2));

  process.exit(fail > 0 ? 1 : 0);
})();
