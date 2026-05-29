const axios = require('axios');

const BASE_URL = String(process.env.API_BASE_URL || 'https://salesmind-api.onrender.com').trim();
const API_EMAIL = String(process.env.API_EMAIL || 'admin@test.com').trim();
const API_PASSWORD = String(process.env.API_PASSWORD || '123456').trim();

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

const results = [];

function addResult(step, ok, detail, extra) {
  const row = {
    step,
    ok,
    detail,
    ...(extra ? { extra } : {}),
  };
  results.push(row);
  const prefix = ok ? 'OK' : 'FALHA';
  console.log(`[${prefix}] ${step} -> ${detail}`);
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function calcCnpjDigit(base, weights) {
  const sum = base
    .split('')
    .reduce((acc, n, idx) => acc + Number(n) * weights[idx], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

function validCnpj(base12 = '112223330001') {
  const base = onlyDigits(base12).padStart(12, '0').slice(0, 12);
  const d1 = calcCnpjDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcCnpjDigit(`${base}${d1}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${base}${d1}${d2}`;
}

function mapFormaParaPagamento(forma) {
  const t = String(forma || '').toUpperCase();
  if (t.includes('CREDITO')) return 'CREDITO';
  if (t.includes('DEBITO')) return 'DEBITO';
  if (t.includes('BOLETO')) return 'BOLETO';
  if (t.includes('DINHEIRO')) return 'DINHEIRO';
  if (t.includes('PIX')) return 'PIX';
  if (t.includes('TRANSFER')) return 'TRANSFERENCIA';
  if (t.includes('CARTEIRA')) return 'CARTEIRA_DIGITAL';
  return 'PIX';
}

function mapFormaToFiscalPagamento(forma) {
  const t = String(forma || '').toUpperCase();
  if (t.includes('CREDITO')) return 'CARTAO_CREDITO';
  if (t.includes('DEBITO')) return 'CARTAO_DEBITO';
  if (t.includes('BOLETO')) return 'BOLETO';
  if (t.includes('DINHEIRO')) return 'DINHEIRO';
  if (t.includes('PIX')) return 'PIX';
  if (t.includes('TRANSFER')) return 'TRANSFERENCIA';
  return 'OUTROS';
}

function buildCompraXml(produto) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const issue = `${yyyy}-${mm}-${dd}T10:00:00-03:00`;
  const due = `${yyyy}-${mm}-${dd}`;

  const cProd = String(produto.codigo || produto.id || 'XML001').slice(0, 20);
  const xProd = String(produto.nome || 'Produto XML teste').replace(/[&<>]/g, ' ');
  const qCom = '2.0000';
  const vUnCom = Number(produto.preco || 1).toFixed(2);
  const vProd = (Number(vUnCom) * 2).toFixed(2);
  const vNF = Number(vProd).toFixed(2);

  const chave = `${yyyy}35${Math.floor(Math.random() * 1e12)
    .toString()
    .padStart(12, '0')}${Math.floor(Math.random() * 1e18)
    .toString()
    .padStart(18, '0')}`.slice(0, 44);

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe${chave}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>12345678</cNF>
        <natOp>Compra para revenda</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>9001</nNF>
        <dhEmi>${issue}</dhEmi>
      </ide>
      <emit>
        <CNPJ>12345678000195</CNPJ>
        <xNome>FORNECEDOR XML TESTE LTDA</xNome>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>${cProd}</cProd>
          <cEAN></cEAN>
          <xProd>${xProd}</xProd>
          <NCM>23091000</NCM>
          <CFOP>1102</CFOP>
          <uCom>UN</uCom>
          <qCom>${qCom}</qCom>
          <vUnCom>${vUnCom}</vUnCom>
          <vProd>${vProd}</vProd>
          <cEANTrib></cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>${qCom}</qTrib>
          <vUnTrib>${vUnCom}</vUnTrib>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vNF>${vNF}</vNF>
          <vFrete>0.00</vFrete>
          <vIPI>0.00</vIPI>
          <vII>0.00</vII>
          <vST>0.00</vST>
        </ICMSTot>
      </total>
      <cobr>
        <dup>
          <nDup>1</nDup>
          <dVenc>${due}</dVenc>
          <vDup>${vNF}</vDup>
        </dup>
      </cobr>
    </infNFe>
  </NFe>
  <protNFe>
    <infProt>
      <chNFe>${chave}</chNFe>
    </infProt>
  </protNFe>
</nfeProc>`;
}

async function safeStep(step, fn) {
  try {
    const value = await fn();
    addResult(step, true, 'Executado com sucesso', value);
    return value;
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    const detail = status ? `HTTP ${status}` : error.message;
    addResult(step, false, detail, data || null);
    return null;
  }
}

async function login() {
  const res = await client.post('/auth/login', {
    email: API_EMAIL,
    senha: API_PASSWORD,
  });
  const token = res.data?.accessToken;
  if (!token) throw new Error('Login sem accessToken.');
  client.defaults.headers.common.Authorization = `Bearer ${token}`;
  return res.data;
}

async function getOrCreateClient() {
  const found = await client.get('/vendas/clientes/buscar', { params: { nome: '%' } });
  if (found.data?.id) return found.data;

  const created = await client.post('/vendas/clientes', {
    nome: 'Cliente Teste Fluxo Fiscal',
    telefone: '11999888777',
    email: 'cliente.teste.fluxo@salesmind.local',
  });
  return created.data;
}

async function getProdutosValidos() {
  const res = await client.get('/produtos', { params: { page: 1, limit: 50 } });
  const lista = Array.isArray(res.data) ? res.data : [];
  return lista.filter((p) => p && p.id && Number(p.preco || 0) > 0);
}

async function createVendaComForma(clienteId, produto, forma) {
  const paymentForma = mapFormaParaPagamento(forma.tipo || forma.id || forma.nome);
  const total = Number(produto.preco || 1);
  const payload = {
    tipo: 'PDV',
    origem: 'PDV',
    clienteId,
    itens: [
      {
        produtoId: produto.id,
        quantidade: 1,
        precoUnitario: total,
        desconto: 0,
        comissao: 0,
      },
    ],
    pagamentos: [
      {
        forma: paymentForma,
        valor: total,
      },
    ],
    descontoTotal: 0,
    frete: 0,
    offline: false,
    observacoes: `Teste forma ${forma.nome || forma.id}`,
  };

  const vendaRes = await client.post('/vendas/vendas', payload);
  return {
    vendaId: vendaRes.data?.id,
    total,
    formaPagamento: paymentForma,
    raw: vendaRes.data,
  };
}

async function emitirNfce(vendaId, total, formaPagamento) {
  const cnpj = validCnpj();
  const fiscalPagamento = mapFormaToFiscalPagamento(formaPagamento);
  const payload = {
    clienteNome: 'EMPRESA TESTE FLUXO LTDA',
    clienteDocumento: cnpj,
    ambiente: 'HOMOLOGACAO',
    naturezaOperacao: 'VENDA DE MERCADORIA',
    consumidorFinal: true,
    presencaComprador: 'OPERACAO_PRESENCIAL',
    destinatario: {
      tipoPessoa: 'JURIDICA',
      razaoSocial: 'EMPRESA TESTE FLUXO LTDA',
      cnpj,
      indicadorIe: 'CONTRIBUINTE_ISENTO',
      email: 'fiscal@teste.local',
      telefone: '1133334444',
      endereco: {
        logradouro: 'Rua Teste',
        numero: '100',
        bairro: 'Centro',
        municipioCodigoIbge: '3550308',
        municipioNome: 'Sao Paulo',
        uf: 'SP',
        cep: '01001000',
      },
    },
    pagamentos: [
      {
        tipo: fiscalPagamento,
        valor: total,
        integracaoPagamento: 'NAO_INTEGRADO',
      },
    ],
  };

  const res = await client.post(`/vendas/vendas/${vendaId}/emitir-nfce`, payload);
  return res.data;
}

async function emitirNfe(vendaId, total, formaPagamento) {
  const cnpj = validCnpj('998887770001');
  const fiscalPagamento = mapFormaToFiscalPagamento(formaPagamento);
  const payload = {
    clienteNome: 'EMPRESA TESTE NFE LTDA',
    clienteDocumento: cnpj,
    ambiente: 'HOMOLOGACAO',
    finalidadeEmissao: 'NORMAL',
    naturezaOperacao: 'VENDA DE MERCADORIA',
    consumidorFinal: false,
    presencaComprador: 'OPERACAO_PRESENCIAL',
    destinatario: {
      tipoPessoa: 'JURIDICA',
      razaoSocial: 'EMPRESA TESTE NFE LTDA',
      cnpj,
      indicadorIe: 'CONTRIBUINTE_ISENTO',
    },
    pagamentos: [
      {
        tipo: fiscalPagamento,
        valor: total,
        integracaoPagamento: 'NAO_INTEGRADO',
      },
    ],
  };

  const res = await client.post(`/vendas/vendas/${vendaId}/emitir-nfe`, payload);
  return res.data;
}

async function main() {
  console.log('\n=== TESTE INTEGRADO FISCAL/COMPRAS ===');
  console.log(`Base URL: ${BASE_URL}\n`);

  await safeStep('Login API', login);

  const formasRecebimento = await safeStep('Listar formas de recebimento', async () => {
    const res = await client.get('/vendas/formas-recebimento');
    const formas = Array.isArray(res.data) ? res.data : [];
    return formas.filter((f) => f && f.ativo !== false);
  });

  await safeStep('Listar formas de pagamento financeiro', async () => {
    const res = await client.get('/financeiro/formas-pagamento');
    return Array.isArray(res.data) ? res.data.length : 0;
  });

  const cliente = await safeStep('Buscar/Criar cliente de teste', getOrCreateClient);
  const produtos = await safeStep('Listar produtos válidos para venda', getProdutosValidos);

  const vendas = [];
  if (cliente?.id && Array.isArray(produtos) && produtos.length > 0 && Array.isArray(formasRecebimento) && formasRecebimento.length > 0) {
    for (let i = 0; i < formasRecebimento.length; i += 1) {
      const forma = formasRecebimento[i];
      const produto = produtos[i % produtos.length];
      const venda = await safeStep(`Criar venda com pagamento ${forma.nome || forma.id || forma.tipo}`, () =>
        createVendaComForma(cliente.id, produto, forma)
      );
      if (venda?.vendaId) vendas.push(venda);
    }
  }

  if (vendas[0]?.vendaId) {
    await safeStep('Emitir nota de saída NFC-e', () => emitirNfce(vendas[0].vendaId, vendas[0].total, vendas[0].formaPagamento));
  }

  if (vendas[1]?.vendaId) {
    await safeStep('Emitir nota de saída NF-e', () => emitirNfe(vendas[1].vendaId, vendas[1].total, vendas[1].formaPagamento));
  }

  if (vendas[0]?.vendaId) {
    await safeStep('Cancelar nota/saída via status da venda', async () => {
      const res = await client.post(`/vendas/vendas/${vendas[0].vendaId}/status`, {
        acao: 'CANCELAR',
        motivo: 'Teste automatizado de cancelamento de nota/saida',
      });
      return res.data;
    });
  }

  const xmlFlow = await safeStep('Entrada de nota por XML (preview + importar)', async () => {
    if (!Array.isArray(produtos) || produtos.length === 0) {
      throw new Error('Sem produto disponível para montar XML de teste.');
    }

    const xml = buildCompraXml(produtos[0]);
    const preview = await client.post('/estoque/compras/notas-fiscais/preview-xml', { xml });
    const imported = await client.post('/estoque/compras/notas-fiscais/importar-xml', { xml });

    return {
      previewNumero: preview.data?.notaFiscal?.numero,
      pedidoCompraId: imported.data?.pedidoCompraId,
      resumo: imported.data?.resumo || null,
      chaveAcesso: imported.data?.notaFiscal?.chaveAcesso,
    };
  });

  let origemLancamento = null;
  await safeStep('Validar lançamento financeiro da nota importada por XML', async () => {
    const notasRes = await client.get('/estoque/compras/notas-fiscais');
    const notas = Array.isArray(notasRes.data) ? notasRes.data : [];

    let notaAlvo = null;
    if (xmlFlow?.pedidoCompraId) {
      notaAlvo = notas.find((n) => n.pedidoCompraId === xmlFlow.pedidoCompraId);
    }
    if (!notaAlvo) {
      notaAlvo = notas[0] || null;
    }

    if (!notaAlvo) {
      throw new Error('Nenhuma nota fiscal de compra encontrada para validar lançamento.');
    }

    origemLancamento = notaAlvo.origemReferenciaFinanceira;
    const lancamentos = Array.isArray(notaAlvo.lancamentosFinanceiros) ? notaAlvo.lancamentosFinanceiros : [];
    if (lancamentos.length === 0) {
      throw new Error('Nota de compra sem lançamentos financeiros vinculados.');
    }

    return {
      pedidoCompraId: notaAlvo.pedidoCompraId,
      numero: notaAlvo.numero,
      origemReferenciaFinanceira: notaAlvo.origemReferenciaFinanceira,
      qtdLancamentos: lancamentos.length,
      primeiroLancamento: {
        id: lancamentos[0]?.id,
        tipo: lancamentos[0]?.tipo,
        status: lancamentos[0]?.status,
        valorBruto: lancamentos[0]?.valorBruto,
      },
    };
  });

  await safeStep('Cancelar compra/NF de compra (validação de endpoint)', async () => {
    const pedidoId = xmlFlow?.pedidoCompraId;
    if (!pedidoId) {
      throw new Error('Sem pedido de compra do fluxo XML para testar cancelamento.');
    }

    try {
      await client.post(`/estoque/compras/pedidos/${pedidoId}/status`, {
        acao: 'CANCELAR',
        motivo: 'Teste automatizado',
      });
      return { endpoint: '/estoque/compras/pedidos/:id/status', status: 'EXISTE' };
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Endpoint de cancelamento de compra/NF de compra não implementado (HTTP 404).');
      }
      throw error;
    }
  });

  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;

  console.log('\n=== RESUMO ===');
  console.log(`Passos: ${results.length} | OK: ${ok} | Falhas: ${fail}`);

  if (origemLancamento) {
    console.log(`Origem de lançamento financeiro validada: ${origemLancamento}`);
  }

  if (fail > 0) {
    console.log('\nFalhas identificadas:');
    results.filter((r) => !r.ok).forEach((r, i) => {
      console.log(` ${i + 1}. ${r.step} -> ${r.detail}`);
    });
    process.exit(1);
  }

  console.log('\nFluxo solicitado validado com sucesso.');
}

main().catch((error) => {
  console.error('\nERRO FATAL NO TESTE INTEGRADO');
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Resposta:', JSON.stringify(error.response.data, null, 2));
  } else {
    console.error(error.message);
  }
  process.exit(1);
});
