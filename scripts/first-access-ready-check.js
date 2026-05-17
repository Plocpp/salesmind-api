const axios = require('axios');
const { spawn, spawnSync } = require('child_process');

const LOCAL_PORT = Number(process.env.FIRST_ACCESS_LOCAL_PORT || 3002);
const EXTERNAL_BASE_URL = process.env.FIRST_ACCESS_BASE_URL;
const BASE_URL = EXTERNAL_BASE_URL || `http://localhost:${LOCAL_PORT}`;
const STARTUP_TIMEOUT_MS = Number(process.env.FIRST_ACCESS_STARTUP_TIMEOUT_MS || 90000);
const INCLUDE_BUILDS = process.env.FIRST_ACCESS_INCLUDE_BUILDS === '1';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runStepCommand(name, command, args, env = {}) {
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      ...env,
      NODE_OPTIONS: '',
    },
  });

  if (result.status !== 0) {
    throw new Error(`falha_no_passo_${name.replace(/\s+/g, '_').toLowerCase()}`);
  }
}

function startLocalServer() {
  const child = spawn('npm run start:runtime', [], {
    cwd: process.cwd(),
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: String(LOCAL_PORT),
      NODE_OPTIONS: '',
      EMAIL_MOCK_MODE: 'true',
      EMAIL_DEV_RETURN_CODE: 'true',
    },
  });

  child.stdout.on('data', (chunk) => process.stdout.write(`[api-local] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[api-local:err] ${chunk}`));

  return child;
}

async function stopLocalServer(child) {
  if (!child || child.killed) return;

  child.kill('SIGTERM');
  await sleep(1500);

  if (!child.killed) {
    child.kill('SIGKILL');
  }
}

async function waitForHealth(baseUrl, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await axios.get(`${baseUrl}/health`, { timeout: 2000 });
      return;
    } catch {
      await sleep(1200);
    }
  }

  throw new Error('timeout_subindo_api_para_primeiro_acesso');
}

async function validateFirstAccess(baseUrl) {
  const email = `primeiro-acesso+${Date.now()}@test.com`;
  const senha = 'Str0ng!PrimeiroAcesso#2026';

  console.log(`\n=== Fluxo de primeiro acesso (${baseUrl}) ===`);

  const health = await axios.get(`${baseUrl}/health`, { timeout: 15000 });
  if (health.status !== 200) {
    throw new Error('health_check_falhou');
  }

  const planos = await axios.get(`${baseUrl}/onboarding/planos`, { timeout: 15000 });
  if (planos.status !== 200) {
    throw new Error('onboarding_planos_indisponivel');
  }

  const cadastro = await axios.post(
    `${baseUrl}/onboarding/cadastro`,
    {
      empresaNome: 'PetShop Primeiro Acesso',
      adminNome: 'Admin Primeiro Acesso',
      adminEmail: email,
      adminSenha: senha,
      planoId: 'starter',
      pais: 'BR',
      moeda: 'BRL',
      precisaPix: true,
      finalidade: 'Validacao de primeiro acesso',
      baseLegal: 'Execucao de contrato',
      consentimentoLgpd: true,
    },
    { timeout: 20000 }
  );

  const preCadastroId = cadastro.data?.preCadastroId;
  if (!preCadastroId) {
    throw new Error('pre_cadastro_nao_gerado');
  }

  const checkout = await axios.get(
    `${baseUrl}/onboarding/mock-checkout/${preCadastroId}?provider=ASAAS&result=paid`,
    { timeout: 20000 }
  );

  const codigo = checkout.data?.result?.ativacao?.codigo;
  if (!codigo) {
    throw new Error('codigo_ativacao_nao_retornado');
  }

  const ativacao = await axios.post(
    `${baseUrl}/onboarding/ativacao/confirmar`,
    { email, codigo },
    { timeout: 15000 }
  );

  if (ativacao.status !== 200) {
    throw new Error('ativacao_nao_confirmada');
  }

  const login = await axios.post(
    `${baseUrl}/auth/login`,
    { email, senha },
    { timeout: 15000 }
  );

  const accessToken = login.data?.accessToken;
  if (!accessToken) {
    throw new Error('login_sem_token_no_primeiro_acesso');
  }

  const me = await axios.get(`${baseUrl}/auth/me`, {
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (me.status !== 200) {
    throw new Error('auth_me_falhou_pos_primeiro_login');
  }

  return {
    email,
    senha,
    role: login.data?.role || null,
    areasPermitidas: login.data?.areasPermitidas || [],
  };
}

async function main() {
  let localServer;
  const executedChecks = [];

  try {
    if (INCLUDE_BUILDS) {
      runStepCommand('Build API (TypeScript estrito)', process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.api.json']);
      executedChecks.push('build:api');
      runStepCommand('Build Frontend', process.execPath, ['node_modules/vite/bin/vite.js', 'build']);
      executedChecks.push('build(frontend)');
    }

    if (!EXTERNAL_BASE_URL) {
      console.log(`\n=== Subindo API local para validacao (${BASE_URL}) ===`);
      localServer = startLocalServer();
      await waitForHealth(BASE_URL, STARTUP_TIMEOUT_MS);
    }

    const onboarding = await validateFirstAccess(BASE_URL);
    executedChecks.push('onboarding');
    executedChecks.push('login');
    executedChecks.push('auth/me');

    runStepCommand('Smoke autenticado com usuario do primeiro acesso', 'node', ['scripts/test-smoke-system.js'], {
      SMOKE_BASE_URL: BASE_URL,
      SMOKE_USER_EMAIL: onboarding.email,
      SMOKE_USER_PASSWORD: onboarding.senha,
    });
    executedChecks.push('smoke');

    console.log('\nPRONTO PARA PRIMEIRO ACESSO');
    console.log(
      JSON.stringify(
        {
          baseUrl: BASE_URL,
          firstAccessUser: onboarding.email,
          role: onboarding.role,
          areasPermitidas: onboarding.areasPermitidas,
          checks: executedChecks,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error('\nFALHA NA PREPARACAO DE PRIMEIRO ACESSO');
    console.error(error?.message || error);
    process.exitCode = 1;
  } finally {
    await stopLocalServer(localServer);
  }
}

main();
