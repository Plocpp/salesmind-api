const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BASE_URL = process.env.VALIDACAO_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.VALIDACAO_USER_EMAIL || 'admin@test.com';
const SENHA = process.env.VALIDACAO_USER_PASSWORD || '123456';

function logStep(title, payload) {
  console.log(`\n[${title}]`);
  console.log(JSON.stringify(payload, null, 2));
}

async function garantirMassaFicticia() {
  const usuario = await prisma.usuario.findFirst({
    where: { email: EMAIL },
    orderBy: { createdAt: 'asc' },
  });

  if (!usuario) {
    throw new Error(`Usuario ${EMAIL} nao encontrado. Crie o usuario antes de rodar este script.`);
  }

  const empresaA = await prisma.empresa.upsert({
    where: { cnpj: '11111111000191' },
    update: { nome: 'Empresa Ficticia Alpha LTDA', ativo: true },
    create: { nome: 'Empresa Ficticia Alpha LTDA', cnpj: '11111111000191', ativo: true },
  });

  const empresaB = await prisma.empresa.upsert({
    where: { cnpj: '22222222000191' },
    update: { nome: 'Empresa Ficticia Beta LTDA', ativo: true },
    create: { nome: 'Empresa Ficticia Beta LTDA', cnpj: '22222222000191', ativo: true },
  });

  const fornecedor = await prisma.fornecedor.upsert({
    where: { cnpj: '33333333000191' },
    update: {
      nome: 'Fornecedor Ficticio Central',
      telefone: '11990000000',
      email: 'fornecedor.ficticio@teste.local',
      endereco: 'Rua de Teste, 100 - Sao Paulo/SP',
    },
    create: {
      nome: 'Fornecedor Ficticio Central',
      cnpj: '33333333000191',
      telefone: '11990000000',
      email: 'fornecedor.ficticio@teste.local',
      endereco: 'Rua de Teste, 100 - Sao Paulo/SP',
    },
  });

  const marca = await prisma.marca.upsert({
    where: { nome: 'Marca Ficticia Prime' },
    update: { fornecedorId: fornecedor.id },
    create: {
      nome: 'Marca Ficticia Prime',
      fornecedorId: fornecedor.id,
      site: 'https://marca-ficticia.local',
    },
  });

  const grupo = await prisma.grupoProduto.upsert({
    where: { id: 'grp-ficticio-validacao-estoque' },
    update: {
      nome: 'Grupo Ficticio Validacao',
      descricao: 'Grupo para testes de validacao de estoque v2',
      empresaId: empresaA.id,
      ativo: true,
    },
    create: {
      id: 'grp-ficticio-validacao-estoque',
      nome: 'Grupo Ficticio Validacao',
      descricao: 'Grupo para testes de validacao de estoque v2',
      empresaId: empresaA.id,
      ativo: true,
    },
  });

  const deposito = await prisma.depositoEstoque.upsert({
    where: { id: 'dep-ficticio-validacao-estoque' },
    update: {
      nome: 'Deposito Ficticio Validacao',
      empresaId: empresaA.id,
      ativo: true,
      tipo: 'PROPRIO',
    },
    create: {
      id: 'dep-ficticio-validacao-estoque',
      nome: 'Deposito Ficticio Validacao',
      empresaId: empresaA.id,
      ativo: true,
      tipo: 'PROPRIO',
      codigo: 'DEP-VAL',
    },
  });

  const clienteA = await prisma.cliente.upsert({
    where: { email: 'cliente.alpha@teste.local' },
    update: { nome: 'Cliente Ficticio Alpha', telefone: '11981111111' },
    create: {
      nome: 'Cliente Ficticio Alpha',
      telefone: '11981111111',
      email: 'cliente.alpha@teste.local',
    },
  });

  const clienteB = await prisma.cliente.upsert({
    where: { email: 'cliente.beta@teste.local' },
    update: { nome: 'Cliente Ficticio Beta', telefone: '11982222222' },
    create: {
      nome: 'Cliente Ficticio Beta',
      telefone: '11982222222',
      email: 'cliente.beta@teste.local',
    },
  });

  const produto = await prisma.produto.upsert({
    where: { codigo: 'PROD-VALIDACAO-V2' },
    update: {
      nome: 'Produto Ficticio Validacao V2',
      marcaId: marca.id,
      grupoProdutoId: grupo.id,
      usuarioId: usuario.id,
      ativo: true,
      tipo: 'FISICO',
      estoque: 15,
      estoqueDisponivel: 15,
      estoqueReservado: 0,
      estoqueMinimo: 5,
      custoMedio: 25.5,
      preco: 39.9,
      markup: 56.47,
      margem: 56.47,
      unidadeMedida: 'UN',
      codigoBarras: '7890000001234',
      validade: new Date('2027-12-31T00:00:00.000Z'),
    },
    create: {
      nome: 'Produto Ficticio Validacao V2',
      peso: 0.3,
      porte: 'PEQUENO',
      preco: 39.9,
      estoque: 15,
      tipo: 'FISICO',
      sku: 'SKU-VALIDACAO-V2',
      codigo: 'PROD-VALIDACAO-V2',
      codigoBarras: '7890000001234',
      unidadeMedida: 'UN',
      custoMedio: 25.5,
      markup: 56.47,
      margem: 56.47,
      estoqueDisponivel: 15,
      estoqueReservado: 0,
      estoqueMinimo: 5,
      validade: new Date('2027-12-31T00:00:00.000Z'),
      usuarioId: usuario.id,
      marcaId: marca.id,
      grupoProdutoId: grupo.id,
      ativo: true,
    },
  });

  await prisma.produtoEstoque.upsert({
    where: {
      produtoId_depositoId: {
        produtoId: produto.id,
        depositoId: deposito.id,
      },
    },
    update: {
      estoqueFisico: 15,
      estoqueDisponivel: 15,
      estoqueReservado: 0,
      estoqueMinimo: 5,
    },
    create: {
      produtoId: produto.id,
      depositoId: deposito.id,
      estoqueFisico: 15,
      estoqueDisponivel: 15,
      estoqueReservado: 0,
      estoqueMinimo: 5,
    },
  });

  return {
    usuarioId: usuario.id,
    empresaAId: empresaA.id,
    empresaBId: empresaB.id,
    fornecedorId: fornecedor.id,
    marcaId: marca.id,
    grupoId: grupo.id,
    depositoId: deposito.id,
    clienteAId: clienteA.id,
    clienteBId: clienteB.id,
    produtoId: produto.id,
  };
}

async function validarNovosEndpoints() {
  const publicClient = axios.create({ baseURL: BASE_URL, timeout: 20000 });
  const login = await publicClient.post('/auth/login', { email: EMAIL, senha: SENHA });
  const token = login.data && login.data.accessToken;
  if (!token) throw new Error('Login sem accessToken');

  const api = axios.create({
    baseURL: BASE_URL,
    timeout: 20000,
    headers: { Authorization: `Bearer ${token}` },
  });

  const itens = await api.get('/estoque/catalogo/itens');
  const validade = await api.get('/estoque/catalogo/indicadores-validade?janelaDias=60');
  const sugestoes = await api.get('/estoque/compras/sugestoes?coberturaDias=30&incluirItensSemVenda=true');

  return {
    catalogoStatus: itens.status,
    catalogoQtd: Array.isArray(itens.data) ? itens.data.length : -1,
    validadeStatus: validade.status,
    validadeResumo: {
      vencidos: validade.data?.vencidos,
      vencendo: validade.data?.vencendo,
      janelaDias: validade.data?.janelaDias,
      itensCriticos: Array.isArray(validade.data?.itensCriticos) ? validade.data.itensCriticos.length : -1,
    },
    sugestoesStatus: sugestoes.status,
    sugestoesQtd: Array.isArray(sugestoes.data) ? sugestoes.data.length : -1,
  };
}

(async () => {
  try {
    const massa = await garantirMassaFicticia();
    logStep('MASSA_FICTICIA_OK', massa);

    const validacao = await validarNovosEndpoints();
    logStep('VALIDACAO_ENDPOINTS_OK', validacao);

    console.log('\n[RESULTADO_FINAL]');
    console.log(JSON.stringify({ ok: true, massa, validacao }, null, 2));
  } catch (error) {
    console.error('\n[ERRO_VALIDACAO]');
    if (error.response) {
      console.error(JSON.stringify({
        message: error.message,
        status: error.response.status,
        data: error.response.data,
      }, null, 2));
    } else {
      console.error(error && error.stack ? error.stack : String(error));
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
