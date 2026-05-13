/**
 * Script de Diagnóstico - Verifica saúde do sistema e encontra erros
 */

const api_url = 'http://localhost:3000';

async function diagnosticar() {
  console.log('🔍 Iniciando diagnóstico do sistema...\n');

  try {
    // 1. Verificar saúde
    console.log('1️⃣ Verificando saúde do sistema...');
    const saudeRes = await fetch(`${api_url}/diagnostico/saude`);
    const saude = await saudeRes.json();
    console.log(JSON.stringify(saude, null, 2));

    // 2. Verificar banco de dados
    console.log('\n2️⃣ Verificando banco de dados...');
    const bancoRes = await fetch(`${api_url}/diagnostico/banco/verificar`, { method: 'POST' });
    const banco = await bancoRes.json();
    console.log(JSON.stringify(banco, null, 2));

    // 3. Verificar migrações
    console.log('\n3️⃣ Verificando migrações...');
    const migracoesRes = await fetch(`${api_url}/diagnostico/migracoes/status`, { method: 'POST' });
    const migracoes = await migracoesRes.json();
    console.log(JSON.stringify(migracoes, null, 2));

    // 4. Verificar erros
    console.log('\n4️⃣ Verificando erros do sistema...');
    const errosRes = await fetch(`${api_url}/diagnostico/erros`);
    const erros = await errosRes.json();
    console.log(`Total de erros: ${erros.total}`);
    console.log(`Críticos: ${erros.stats.critical}, Altos: ${erros.stats.high}`);

    // 5. Testar API financeira
    console.log('\n5️⃣ Testando API de vendas...');
    const token = localStorage.getItem('token') || 'test-token';
    const vendasRes = await fetch(`${api_url}/vendas`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`Status: ${vendasRes.status}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executar
diagnosticar();
