const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = String(process.env.API_BASE_URL || 'http://localhost:3000').trim();
const API_EMAIL = String(process.env.API_EMAIL || 'admin@test.com').trim();
const API_PASSWORD = String(process.env.API_PASSWORD || '123456').trim();

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

const somenteDigitos = (valor) => String(valor || '').replace(/\D/g, '');

function calcularDigitoCnpj(base, pesos) {
  const soma = base
    .split('')
    .reduce((acc, numero, index) => acc + Number(numero) * pesos[index], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function gerarCnpjValido(base12 = '112223330001') {
  const normalizado = somenteDigitos(base12).padStart(12, '0').slice(0, 12);
  const d1 = calcularDigitoCnpj(normalizado, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcularDigitoCnpj(`${normalizado}${d1}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${normalizado}${d1}${d2}`;
}

function toMoney(value) {
  return Number(value || 0).toFixed(2);
}

async function login() {
  const response = await client.post('/auth/login', {
    email: API_EMAIL,
    senha: API_PASSWORD,
  });

  const token = response.data.accessToken;
  if (!token) {
    throw new Error('Login sem token de acesso.');
  }

  client.defaults.headers.common.Authorization = `Bearer ${token}`;
  return response.data;
}

async function buscarOuCriarCliente() {
  const busca = await client.get('/vendas/clientes/buscar', { params: { nome: '%' } });
  if (busca.data && busca.data.id) {
    return busca.data;
  }

  const criado = await client.post('/vendas/clientes', {
    nome: 'Cliente Teste NFCe CNPJ',
    telefone: '11999998888',
    email: 'cliente.nfce.teste@salesmind.local',
  });

  return criado.data;
}

async function buscarProdutosParaTeste() {
  const response = await client.get('/produtos', { params: { page: 1, limit: 20 } });
  const lista = Array.isArray(response.data) ? response.data : [];
  const validos = lista
    .filter((produto) => produto && produto.id && Number(produto.preco || 0) > 0)
    .slice(0, 4);

  if (validos.length === 0) {
    throw new Error('Nenhum produto valido encontrado para o teste.');
  }

  return validos;
}

function construirItensVenda(produtos) {
  const itens = produtos.slice(0, 3).map((produto, index) => ({
    produtoId: produto.id,
    quantidade: index + 1,
    precoUnitario: Number(produto.preco || 0),
    desconto: 0,
    comissao: 0,
  }));

  if (itens.length === 1) {
    itens.push({ ...itens[0], quantidade: 2 });
    itens.push({ ...itens[0], quantidade: 1 });
  }

  if (itens.length === 2) {
    itens.push({ ...itens[0], quantidade: 1 });
  }

  return itens;
}

function construirItensFiscais(produtos, itensVenda) {
  return itensVenda.map((item, index) => {
    const produto = produtos.find((p) => p.id === item.produtoId);
    return {
      codigo: produto?.codigo || `SKU-${index + 1}`,
      descricao: produto?.nome || `Produto ${index + 1}`,
      ncm: '23091000',
      cfop: '5102',
      unidadeComercial: 'UN',
      quantidadeComercial: Number(item.quantidade),
      valorUnitarioComercial: Number(item.precoUnitario),
      desconto: Number(item.desconto || 0),
      origemIcms: '0',
      cstIcms: '102',
      cstPis: '49',
      cstCofins: '49',
    };
  });
}

function escreverRelatorios(relatorio) {
  const outputDir = path.resolve(__dirname, '..', 'docs', 'relatorios');
  fs.mkdirSync(outputDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(outputDir, `nfce-cnpj-teste-${stamp}.json`);
  const mdPath = path.join(outputDir, `nfce-cnpj-teste-${stamp}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(relatorio, null, 2), 'utf8');

  const linhas = [
    '# Relatorio de Teste NFC-e CNPJ',
    '',
    `- Data: ${relatorio.executadoEm}`,
    `- Base URL: ${relatorio.baseUrl}`,
    `- Venda ID: ${relatorio.venda.id}`,
    `- NFC-e numero: ${relatorio.nfce.numero}`,
    `- NFC-e status: ${relatorio.nfce.status}`,
    `- CNPJ destinatario: ${relatorio.nfce.destinatario?.cnpj || 'N/A'}`,
    '',
    '## Itens vendidos',
    ...relatorio.venda.itens.map((item, idx) => `- ${idx + 1}. ${item.nome} | qtd ${item.quantidade} | unit R$ ${toMoney(item.precoUnitario)}`),
    '',
    '## Validacoes',
    ...relatorio.validacoes.map((v) => `- ${v.nome}: ${v.ok ? 'OK' : 'FALHOU'}${v.detalhe ? ` (${v.detalhe})` : ''}`),
    '',
    '## Totais',
    `- Total venda: R$ ${toMoney(relatorio.venda.total)}`,
    `- Total NFC-e: R$ ${toMoney(relatorio.nfce.valorTotal)}`,
  ];

  fs.writeFileSync(mdPath, `${linhas.join('\n')}\n`, 'utf8');

  return { jsonPath, mdPath };
}

async function executar() {
  console.log('\n=== TESTE NFC-e CNPJ (E2E) ===\n');

  const loginData = await login();
  const cliente = await buscarOuCriarCliente();
  const produtos = await buscarProdutosParaTeste();
  const itensVenda = construirItensVenda(produtos);
  const total = itensVenda.reduce((acc, item) => acc + (Number(item.precoUnitario) * Number(item.quantidade)), 0);

  const venda = await client.post('/vendas/vendas', {
    tipo: 'PDV',
    origem: 'PDV',
    clienteId: cliente.id,
    itens: itensVenda,
    pagamentos: [
      {
        forma: 'PIX',
        valor: total,
      },
    ],
    descontoTotal: 0,
    frete: 0,
    offline: false,
    observacoes: 'Teste automatizado de emissao NFC-e com CNPJ.',
  });

  const vendaId = venda.data.id;
  if (!vendaId) {
    throw new Error('Venda nao retornou id.');
  }

  const cnpjTeste = gerarCnpjValido();

  const emissao = await client.post(`/vendas/vendas/${vendaId}/emitir-nfce`, {
    clienteNome: 'EMPRESA TESTE NFC-E LTDA',
    clienteDocumento: cnpjTeste,
    ambiente: 'HOMOLOGACAO',
    naturezaOperacao: 'VENDA DE MERCADORIA',
    consumidorFinal: true,
    presencaComprador: 'OPERACAO_PRESENCIAL',
    destinatario: {
      tipoPessoa: 'JURIDICA',
      razaoSocial: 'EMPRESA TESTE NFC-E LTDA',
      cnpj: cnpjTeste,
      indicadorIe: 'CONTRIBUINTE_ISENTO',
      email: 'fiscal@empresa-teste.local',
      telefone: '1133334444',
      endereco: {
        logradouro: 'Rua Fiscal',
        numero: '100',
        bairro: 'Centro',
        municipioCodigoIbge: '3550308',
        municipioNome: 'Sao Paulo',
        uf: 'SP',
        cep: '01001000',
      },
    },
    itensFiscais: construirItensFiscais(produtos, itensVenda),
    totais: {
      frete: 0,
      seguro: 0,
      desconto: 0,
      outrasDespesas: 0,
    },
    pagamentos: [
      {
        tipo: 'PIX',
        valor: total,
        integracaoPagamento: 'NAO_INTEGRADO',
      },
    ],
    observacoes: 'Teste E2E com varios produtos e destinatario CNPJ.',
  });

  const nfce = emissao.data?.nfce || {};

  const validacoes = [
    { nome: 'Venda criada', ok: Boolean(vendaId) },
    { nome: 'NFC-e retornada', ok: Boolean(nfce.numero) },
    { nome: 'Status autorizada', ok: String(nfce.status || '').toUpperCase() === 'AUTORIZADA', detalhe: nfce.status },
    { nome: 'Documento CNPJ no payload', ok: somenteDigitos(nfce.documentoCliente || '') === cnpjTeste },
    { nome: 'Destinatario CNPJ estruturado', ok: somenteDigitos(nfce.destinatario?.cnpj || '') === cnpjTeste },
    { nome: 'Itens fiscais preenchidos', ok: Array.isArray(nfce.itensFiscais) && nfce.itensFiscais.length >= 3, detalhe: `itens=${Array.isArray(nfce.itensFiscais) ? nfce.itensFiscais.length : 0}` },
    {
      nome: 'Valor total coerente',
      ok: Math.abs(Number(nfce.valorTotal || 0) - Number(total)) < 0.01,
      detalhe: `nfce=${nfce.valorTotal} venda=${total}`,
    },
  ];

  const relatorio = {
    executadoEm: new Date().toISOString(),
    baseUrl: BASE_URL,
    usuario: loginData.usuario || loginData.user || null,
    venda: {
      id: vendaId,
      total,
      itens: itensVenda.map((item) => {
        const produto = produtos.find((p) => p.id === item.produtoId);
        return {
          produtoId: item.produtoId,
          nome: produto?.nome || 'Produto',
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
        };
      }),
    },
    nfce,
    validacoes,
  };

  const paths = escreverRelatorios(relatorio);

  console.log('Base URL:', BASE_URL);
  console.log('Venda ID:', vendaId);
  console.log('NFC-e:', nfce.numero, '| status:', nfce.status);
  console.log('Validacoes:');
  validacoes.forEach((v) => {
    console.log(` - ${v.ok ? 'OK' : 'FALHOU'} | ${v.nome}${v.detalhe ? ` | ${v.detalhe}` : ''}`);
  });
  console.log('Relatorios gerados:');
  console.log(' - JSON:', paths.jsonPath);
  console.log(' - MD  :', paths.mdPath);

  const falhas = validacoes.filter((v) => !v.ok);
  if (falhas.length > 0) {
    throw new Error(`Teste concluido com ${falhas.length} validacao(oes) falha(s).`);
  }

  console.log('\nTeste NFC-e CNPJ concluido com sucesso.\n');
}

executar().catch((error) => {
  console.error('\nERRO NO TESTE NFC-e CNPJ');
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Resposta:', JSON.stringify(error.response.data, null, 2));
  } else {
    console.error(error.message);
  }
  process.exit(1);
});
