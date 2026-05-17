const axios = require('axios');
const { spawn } = require('child_process');

const TEST_PORT = 3001;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const STARTUP_TIMEOUT_MS = 60000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(baseUrl, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      await axios.get(`${baseUrl}/health`, { timeout: 1500 });
      return;
    } catch {
      await sleep(1000);
    }
  }
  throw new Error('timeout_subindo_backend_teste');
}

function startTestServer() {
  const child = spawn('npm run dev', [], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      EMAIL_DEV_RETURN_CODE: 'true',
      EMAIL_MOCK_MODE: 'true',
    },
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[backend-teste] ${chunk}`);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[backend-teste:err] ${chunk}`);
  });

  return child;
}

async function stopTestServer(child) {
  if (!child || child.killed) return;

  child.kill('SIGTERM');
  await sleep(1500);

  if (!child.killed) {
    child.kill('SIGKILL');
  }
}

async function executarTeste() {
  const email = `qa+acesso-${Date.now()}@test.com`;
  const senha = 'Str0ng!Test#2026';

  const cadastroPayload = {
    empresaNome: 'PetShop Pacote Teste Auto',
    adminNome: 'Admin Pacote Auto',
    adminEmail: email,
    adminSenha: senha,
    planoId: 'starter',
    pais: 'BR',
    moeda: 'BRL',
    precisaPix: true,
    finalidade: 'Teste automatizado onboarding pacote',
    baseLegal: 'Execucao de contrato',
    consentimentoLgpd: true,
  };

  const cadastro = await axios.post(`${BASE_URL}/onboarding/cadastro`, cadastroPayload, { timeout: 15000 });
  const preCadastroId = cadastro.data.preCadastroId;

  const checkout = await axios.get(
    `${BASE_URL}/onboarding/mock-checkout/${preCadastroId}?provider=ASAAS&result=paid`,
    { timeout: 15000 }
  );

  const codigo = checkout.data?.result?.ativacao?.codigo;
  if (!codigo) {
    throw new Error('codigo_ativacao_nao_retornou_no_mock_checkout');
  }

  const ativacao = await axios.post(
    `${BASE_URL}/onboarding/ativacao/confirmar`,
    { email, codigo },
    { timeout: 15000 }
  );

  const login = await axios.post(
    `${BASE_URL}/auth/login`,
    { email, senha },
    { timeout: 15000 }
  );

  const accessToken = login.data?.accessToken;
  if (!accessToken) {
    throw new Error('login_sem_access_token');
  }

  const resultado = {
    ok: true,
    preCadastroId,
    email,
    statusAtivacao: ativacao.data?.status || null,
    role: login.data?.role || null,
    areasPermitidas: login.data?.areasPermitidas || [],
  };

  console.log('\nRESULTADO TESTE ONBOARDING ACESSO:');
  console.log(JSON.stringify(resultado, null, 2));
}

(async () => {
  let server;
  try {
    server = startTestServer();
    await waitForHealth(BASE_URL, STARTUP_TIMEOUT_MS);
    await executarTeste();
    process.exitCode = 0;
  } catch (error) {
    process.exitCode = 1;
    console.error('\nFALHA NO TESTE ONBOARDING ACESSO');
    console.error(error?.message || error);
  } finally {
    await stopTestServer(server);
  }
})();
