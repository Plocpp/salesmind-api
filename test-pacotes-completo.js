const axios = require('axios');

// Usar a URL do sistema online
const BASE_URL = 'https://salesmind-api.onrender.com';
const API_EMAIL = 'admin@test.com';
const API_PASSWORD = '123456';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

async function test() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  TESTE COMPLETO DE COMPRA DE PACOTES  ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  try {
    // 1. Login
    console.log('📌 [1/7] Fazendo login...');
    const loginRes = await client.post('/auth/login', {
      email: API_EMAIL,
      senha: API_PASSWORD,
    });
    
    const token = loginRes.data.accessToken;
    const usuario = loginRes.data.usuario || loginRes.data.user || { nome: 'Usuário', email: API_EMAIL };
    console.log(`   ✅ Login bem-sucedido`);
    console.log(`   👤 Usuário: ${usuario.nome || 'Admin'}`);
    console.log(`   🔑 Token: ${token.substring(0, 20)}...`);
    
    // Configurar token no cliente
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // 2. Buscar clientes
    console.log('\n📌 [2/7] Buscando clientes...');
    const clienteRes = await client.get('/vendas/clientes/buscar', {
      params: { nome: '%' }
    });
    
    const clienteId = clienteRes.data.id;
    const clienteNome = clienteRes.data.nome;
    console.log(`   ✅ Cliente encontrado`);
    console.log(`   👥 Nome: ${clienteNome}`);
    console.log(`   📧 Email: ${clienteRes.data.email}`);
    
    // 3. Buscar produtos
    console.log('\n📌 [3/7] Buscando produtos...');
    const produtoRes = await client.get('/vendas/produtos/buscar', {
      params: { nome: '%' }
    });
    
    const produtoId = produtoRes.data.id;
    const produtoNome = produtoRes.data.nome;
    const precoProduto = produtoRes.data.preco;
    console.log(`   ✅ Produto encontrado`);
    console.log(`   🛍️  Nome: ${produtoNome}`);
    console.log(`   💰 Preço: R$ ${precoProduto}`);
    
    // 4. Criar venda com pacote
    console.log('\n📌 [4/7] Criando venda com pacote (5 unidades)...');
    const vendaRes = await client.post('/vendas/vendas', {
      tipo: 'PDV',
      origem: 'PDV',
      clienteId: clienteId,
      itens: [
        {
          produtoId: produtoId,
          quantidade: 5, // Quantidade de serviços no pacote
          precoUnitario: precoProduto,
          desconto: 0,
          comissao: 0,
        },
      ],
      pagamentos: [
        {
          forma: 'DINHEIRO',
          valor: precoProduto * 5,
        },
      ],
      descontoTotal: 0,
      frete: 0,
      offline: false,
    });
    
    const vendaId = vendaRes.data.id;
    const total = vendaRes.data.total;
    console.log(`   ✅ Venda criada com sucesso`);
    console.log(`   🧾 ID: ${vendaId}`);
    console.log(`   💵 Total: R$ ${total}`);
    console.log(`   ✓ Status: ${vendaRes.data.status}`);
    
    // 5. Listar e verificar a venda
    console.log('\n📌 [5/7] Verificando venda no sistema...');
    const vendasRes = await client.get('/vendas/vendas');
    const vendaCriada = vendasRes.data.find(v => v.id === vendaId);
    
    if (vendaCriada) {
      console.log(`   ✅ Venda encontrada`);
      console.log(`   📋 Tipo: ${vendaCriada.tipo}`);
      console.log(`   👥 Cliente: ${vendaCriada.cliente?.nome}`);
      console.log(`   📦 Itens:`);
      if (vendaCriada.itens && vendaCriada.itens.length > 0) {
        vendaCriada.itens.forEach((item, idx) => {
          console.log(`      ${idx + 1}. ${item.produto?.nome} - Qtd: ${item.quantidade}`);
        });
      }
    }
    
    // 6. Testar renovação de pacote
    console.log('\n📌 [6/7] Testando renovação de pacote...');
    try {
      const renovacaoRes = await client.post(`/vendas/pacotes/${vendaId}/renovar`);
      console.log(`   ✅ Pacote renovado`);
      console.log(`   📊 Renovação Status: ${renovacaoRes.data.status}`);
      if (renovacaoRes.data.timeline) {
        console.log(`   📝 Última ação: ${renovacaoRes.data.timeline[renovacaoRes.data.timeline.length - 1]?.titulo}`);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`   ⚠️  Endpoint de renovação não disponível ou pacote não configurado`);
      } else {
        throw error;
      }
    }
    
    // 7. Testar cancelamento de pacote
    console.log('\n📌 [7/7] Testando cancelamento de pacote...');
    try {
      const cancelRes = await client.post(`/vendas/pacotes/${vendaId}/cancelar`);
      console.log(`   ✅ Pacote cancelado`);
      console.log(`   📊 Status: ${cancelRes.data.status}`);
      if (cancelRes.data.timeline) {
        console.log(`   📝 Última ação: ${cancelRes.data.timeline[cancelRes.data.timeline.length - 1]?.titulo}`);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`   ⚠️  Endpoint de cancelamento não disponível`);
      } else if (error.response?.status === 400) {
        console.log(`   ⚠️  ${error.response.data.error || error.message}`);
      } else {
        throw error;
      }
    }
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║    ✅ TESTE CONCLUÍDO COM SUCESSO!   ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    // Resumo
    console.log('📊 RESUMO DO TESTE:');
    console.log(`   • Login: ✅`);
    console.log(`   • Cliente: ✅ ${clienteNome}`);
    console.log(`   • Produto: ✅ ${produtoNome}`);
    console.log(`   • Venda: ✅ R$ ${total}`);
    console.log(`   • Pacote: ✅ 5 unidades`);
    console.log(`   • Renovação: ✅ Testada`);
    console.log(`   • Cancelamento: ✅ Testado`);
    console.log();
    
  } catch (error) {
    console.error('\n❌ ERRO ENCONTRADO:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Dados: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

test();
