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
  console.log('\n=== TESTE DE COMPRA DE PACOTES ===\n');
  
  try {
    // 1. Login
    console.log('1️⃣ Fazendo login...');
    const loginRes = await client.post('/auth/login', {
      email: API_EMAIL,
      senha: API_PASSWORD,
    });
    
    const token = loginRes.data.accessToken;
    console.log('✅ Login bem-sucedido');
    console.log(`   Token: ${token.substring(0, 20)}...`);
    
    // Configurar token no cliente
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // 2. Buscar clientes
    console.log('\n2️⃣ Buscando clientes...');
    const clientesRes = await client.get('/vendas/clientes/buscar', {
      params: { nome: '%' } // Buscar todos com nome contendo %
    });
    
    // O endpoint retorna um único cliente ou null
    const cliente = clientesRes.data;
    
    if (cliente && cliente.id) {
      var clienteId = cliente.id;
      console.log(`✅ Cliente encontrado: ${cliente.nome}`);
    } else {
      console.log('❌ Nenhum cliente encontrado. Criando um novo...');
      const novoClienteRes = await client.post('/vendas/clientes', {
        nome: 'Cliente Teste Pacote',
        email: `cliente-pacote-${Date.now()}@test.com`,
        telefone: '11999999999',
      });
      var clienteId = novoClienteRes.data.id;
      console.log(`✅ Cliente criado: ${clienteId}`);
    }
    
    // 3. Buscar produtos
    console.log('\n3️⃣ Buscando produtos...');
    const produtosRes = await client.get('/vendas/produtos/buscar', {
      params: { nome: '%' } // Buscar todos
    });
    
    const produto = produtosRes.data;
    
    if (!produto || !produto.id) {
      console.log('❌ Nenhum produto encontrado');
      return;
    }
    console.log(`✅ Usando produto: ${produto.nome} (R$ ${produto.preco})`);
    
    // 4. Criar venda com pacote
    console.log('\n4️⃣ Criando venda com pacote...');
    const vendaRes = await client.post('/vendas/vendas', {
      tipo: 'PDV',
      origem: 'PDV',
      clienteId: clienteId,
      itens: [
        {
          produtoId: produto.id,
          quantidade: 5, // Quantidade de serviços no pacote
          precoUnitario: produto.preco,
          desconto: 0,
          comissao: 0,
        },
      ],
      pagamentos: [
        {
          forma: 'DINHEIRO',
          valor: produto.preco * 5,
        },
      ],
      descontoTotal: 0,
      frete: 0,
      offline: false,
    });
    
    const vendaId = vendaRes.data.id;
    const total = vendaRes.data.total;
    console.log(`✅ Venda criada: ${vendaId}`);
    console.log(`   Total: R$ ${total}`);
    console.log(`   Status: ${vendaRes.data.status}`);
    
    // 5. Verificar se pacote foi criado
    console.log('\n5️⃣ Buscando vendas para verificar pacote...');
    const vendasRes = await client.get('/vendas/vendas');
    const vendaCriada = vendasRes.data.find(v => v.id === vendaId);
    
    if (vendaCriada) {
      console.log(`✅ Venda encontrada no sistema`);
      console.log(`   Tipo: ${vendaCriada.tipo}`);
      console.log(`   Status: ${vendaCriada.status}`);
      console.log(`   Cliente: ${vendaCriada.cliente?.nome}`);
    }
    
    // 6. Listar itens da venda
    console.log('\n6️⃣ Itens da venda:');
    if (vendaCriada.itens && vendaCriada.itens.length > 0) {
      vendaCriada.itens.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.produto?.nome} - Qtd: ${item.quantidade} x R$ ${item.precoUnitario}`);
      });
    }
    
    console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!\n');
    
  } catch (error) {
    console.error('\n❌ ERRO:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Dados: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   ${error.message}`);
    }
  }
}

test();
