import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome e obrigatorio'),
  telefone: z.string().optional(),
  email: z.string().email().optional(),
});

const itemVendaSchema = z.object({
  produtoId: z.string(),
  quantidade: z.number().positive(),
  precoUnitario: z.number().nonnegative(),
  desconto: z.number().default(0),
  comissao: z.number().default(0),
});

const pagamentoVendaSchema = z.object({
  forma: z.enum(['DINHEIRO', 'PIX', 'CREDITO', 'DEBITO', 'BOLETO', 'CREDIARIO', 'LINK_PAGAMENTO', 'CARTEIRA_DIGITAL', 'TRANSFERENCIA']),
  valor: z.number().positive(),
  parcelas: z.number().int().positive().default(1),
  taxaPercentual: z.number().default(0),
  taxaFixa: z.number().default(0),
  vencimento: z.coerce.date().optional(),
  gateway: z.string().optional(),
  autorizacao: z.string().optional(),
  nsu: z.string().optional(),
});

const vendaSchema = z.object({
  clienteId: z.string().optional(),
  tipo: z.enum(['PDV', 'PEDIDO', 'ORCAMENTO_CONVERTIDO', 'MARKETPLACE', 'ASSINATURA', 'SERVICO']).default('PDV'),
  status: z.enum(['AGUARDANDO_PAGAMENTO', 'PAGO', 'SEPARADO', 'FATURADO', 'ENVIADO', 'ENTREGUE', 'CANCELADO', 'ESTORNADO']).optional(),
  origem: z.enum(['PDV', 'BALCAO', 'MERCADO_LIVRE', 'SHOPEE', 'AMAZON', 'MAGAZINE_LUIZA', 'BLING', 'API', 'MANUAL', 'OFFLINE']).default('PDV'),
  itens: z.array(itemVendaSchema).min(1, 'Pelo menos um item e necessario'),
  pagamentos: z.array(pagamentoVendaSchema).default([]),
  empresaId: z.string().optional(),
  listaPrecoId: z.string().optional(),
  caixaId: z.string().optional(),
  marketplacePedidoId: z.string().optional(),
  marketplaceConta: z.string().optional(),
  canal: z.string().optional(),
  terminal: z.string().optional(),
  offline: z.boolean().default(false),
  descontoTotal: z.number().default(0),
  frete: z.number().default(0),
  observacoes: z.string().optional(),
  categoriaId: z.string().optional(),
  contaFinanceiraId: z.string().optional(),
  formaPagamentoId: z.string().optional(),
});

const caixaSchema = z.object({
  terminal: z.string().optional(),
  loja: z.string().optional(),
  turno: z.string().optional(),
  saldoInicial: z.number().default(0),
  empresaId: z.string().optional(),
});

const movimentoCaixaSchema = z.object({
  caixaId: z.string(),
  tipo: z.enum(['VENDA', 'SANGRIA', 'SUPRIMENTO', 'ESTORNO', 'RETIRADA', 'QUEBRA', 'SOBRA', 'DESPESA', 'TRANSFERENCIA']),
  valor: z.number().positive(),
  descricao: z.string().optional(),
  terminal: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const listaPrecoSchema = z.object({
  nome: z.string().min(1),
  tipo: z.enum(['VAREJO', 'ATACADO', 'MARKETPLACE', 'DISTRIBUIDOR', 'PROMOCIONAL', 'CLIENTE']).default('VAREJO'),
  vigenciaInicio: z.coerce.date().optional(),
  vigenciaFim: z.coerce.date().optional(),
  margemMinima: z.number().optional(),
  markupPadrao: z.number().optional(),
  empresaId: z.string().optional(),
  itens: z.array(z.object({
    produtoId: z.string(),
    preco: z.number().nonnegative(),
    promocional: z.number().nonnegative().optional(),
    inicio: z.coerce.date().optional(),
    fim: z.coerce.date().optional(),
  })).default([]),
});

const orcamentoSchema = z.object({
  titulo: z.string().min(1),
  numero: z.string().optional(),
  clienteId: z.string().optional(),
  validade: z.coerce.date().optional(),
  total: z.number().nonnegative().default(0),
  linkPublico: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const configuracaoVendasSchema = z.object({
  descontoMaximo: z.number().min(0).max(100).default(10),
  comissaoPadrao: z.number().min(0).max(100).default(5),
  validadeOrcamentoDias: z.number().int().positive().default(7),
  permitirVendaOffline: z.boolean().default(true),
  exigirAprovacaoDesconto: z.boolean().default(false),
  nfeAutomatica: z.boolean().default(false),
  sincronizarMarketplace: z.boolean().default(true),
  atualizarEstoqueMarketplace: z.boolean().default(true),
  atualizarPrecoMarketplace: z.boolean().default(false),
  jurosMensal: z.number().min(0).default(0),
  multaAtraso: z.number().min(0).default(0),
  prazoRecebimentoPadrao: z.number().int().min(0).default(30),
});

export class VendasService {
  async criarCliente(data: z.infer<typeof clienteSchema>) {
    return prisma.cliente.create({ data: clienteSchema.parse(data) });
  }

  async buscarCliente(nome?: string, telefone?: string, email?: string) {
    if (!nome && !telefone && !email) {
      throw new Error('Nome, telefone ou email deve ser fornecido');
    }

    return prisma.cliente.findFirst({
      where: {
        OR: [
          nome ? { nome: { contains: nome } } : {},
          telefone ? { telefone } : {},
          email ? { email } : {},
        ].filter((condition) => Object.keys(condition).length > 0),
      },
    });
  }

  async buscarProduto(filtro: { nome?: string; codigo?: string; codigoBarras?: string }) {
    const { nome, codigo, codigoBarras } = filtro;
    if (!nome && !codigo && !codigoBarras) {
      throw new Error('Pelo menos um criterio de busca deve ser fornecido');
    }

    return prisma.produto.findFirst({
      where: {
        AND: [
          nome ? { nome: { contains: nome } } : {},
          codigo ? { codigo } : {},
          codigoBarras ? { codigoBarras } : {},
          { ativo: true },
        ].filter((condition) => Object.keys(condition).length > 0),
      },
      include: { marca: true },
    });
  }

  async criarVenda(data: z.infer<typeof vendaSchema>, usuarioId: string) {
    const vendaValidada = vendaSchema.parse(data);
    const produtos = await prisma.produto.findMany({
      where: { id: { in: vendaValidada.itens.map((item) => item.produtoId) } },
    });

    const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]));
    const itensCalculados = vendaValidada.itens.map((item) => {
      const produto = produtosPorId.get(item.produtoId);
      if (!produto) throw new Error(`Produto ${item.produtoId} nao encontrado`);

      const estoqueDisponivel = Number((produto as any).estoqueDisponivel || produto.estoque);
      if (produto.tipo === 'FISICO' && estoqueDisponivel < item.quantidade) {
        throw new Error(`Estoque insuficiente para ${produto.nome}`);
      }

      const subtotal = item.quantidade * item.precoUnitario;
      const total = subtotal - item.desconto;
      const custoUnitario = Number(produto.custoMedio || 0);
      return { ...item, subtotal, total, custoUnitario };
    });

    const subtotal = itensCalculados.reduce((total, item) => total + item.subtotal, 0);
    const descontoItens = itensCalculados.reduce((total, item) => total + item.desconto, 0);
    const descontoTotal = vendaValidada.descontoTotal + descontoItens;
    const custoTotal = itensCalculados.reduce((total, item) => total + item.custoUnitario * item.quantidade, 0);
    const comissao = itensCalculados.reduce((total, item) => total + item.comissao, 0);
    const total = subtotal - descontoTotal + vendaValidada.frete;
    const lucro = total - custoTotal - comissao;
    const margem = total > 0 ? Number(((lucro / total) * 100).toFixed(2)) : 0;
    const totalPago = vendaValidada.pagamentos.reduce((soma, pagamento) => soma + pagamento.valor, 0);
    const status = vendaValidada.status ?? (totalPago >= total ? 'PAGO' : 'AGUARDANDO_PAGAMENTO');

    return prisma.$transaction(async (tx) => {
      const venda = await tx.venda.create({
        data: {
          numero: `VD-${Date.now()}`,
          tipo: vendaValidada.tipo,
          status,
          origem: vendaValidada.origem,
          subtotal,
          descontoTotal,
          frete: vendaValidada.frete,
          comissao,
          custoTotal,
          lucro,
          margem,
          total,
          usuarioId,
          clienteId: vendaValidada.clienteId,
          empresaId: vendaValidada.empresaId,
          listaPrecoId: vendaValidada.listaPrecoId,
          caixaId: vendaValidada.caixaId,
          marketplacePedidoId: vendaValidada.marketplacePedidoId,
          marketplaceConta: vendaValidada.marketplaceConta,
          canal: vendaValidada.canal,
          terminal: vendaValidada.terminal,
          offline: vendaValidada.offline,
          dataPagamento: status === 'PAGO' ? new Date() : undefined,
          observacoes: vendaValidada.observacoes,
          itens: {
            create: itensCalculados.map((item) => ({
              produtoId: item.produtoId,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              desconto: item.desconto,
              custoUnitario: item.custoUnitario,
              subtotal: item.subtotal,
              total: item.total,
              comissao: item.comissao,
            })),
          },
          pagamentos: {
            create: vendaValidada.pagamentos.map((pagamento) => ({
              ...pagamento,
              status: status === 'PAGO' ? 'RECEBIDO' : 'PENDENTE',
              recebidoEm: status === 'PAGO' ? new Date() : undefined,
            })),
          },
          timeline: {
            create: {
              status,
              titulo: 'Venda criada',
              detalhe: `Origem ${vendaValidada.origem}`,
            },
          },
        },
        include: { itens: { include: { produto: true } }, cliente: true, usuario: true, pagamentos: true, timeline: true },
      });

      for (const item of itensCalculados) {
        const produto = produtosPorId.get(item.produtoId);
        if (produto?.tipo === 'FISICO') {
          await tx.produto.update({
            where: { id: item.produtoId },
            data: {
              estoque: { decrement: item.quantidade },
              estoqueDisponivel: { decrement: item.quantidade },
            },
          });

          await (tx as any).movimentacaoEstoque.create({
            data: {
              produtoId: item.produtoId,
              tipo: 'SAIDA_VENDA',
              status: 'CONCLUIDA',
              origem: this.mapOrigemEstoque(vendaValidada.origem),
              quantidade: item.quantidade,
              origemReferencia: venda.id,
              usuarioId,
              motivo: 'Baixa automatica por venda',
              valorTotal: item.total,
              metadata: { vendaId: venda.id, desconto: item.desconto },
            },
          });
        }
      }

      await (tx as any).lancamentoFinanceiro.create({
        data: {
          descricao: `Receita da venda ${venda.numero || venda.id}`,
          tipo: 'RECEITA',
          status: status === 'PAGO' ? 'PAGO' : 'PENDENTE',
          valorBruto: total,
          valorLiquido: total,
          valorPago: status === 'PAGO' ? totalPago : 0,
          competencia: venda.data,
          vencimento: new Date(),
          pagamento: status === 'PAGO' ? new Date() : undefined,
          origem: this.mapOrigemFinanceira(vendaValidada.origem),
          origemReferencia: venda.id,
          empresaId: vendaValidada.empresaId,
          categoriaId: vendaValidada.categoriaId,
          contaFinanceiraId: vendaValidada.contaFinanceiraId,
          formaPagamentoId: vendaValidada.formaPagamentoId,
          vendaId: venda.id,
          clienteId: vendaValidada.clienteId,
          usuarioId,
          metadata: { fonte: 'vendas.service', pagamentos: vendaValidada.pagamentos.length },
        },
      });

      if (vendaValidada.caixaId && totalPago > 0) {
        await (tx as any).movimentoCaixa.create({
          data: {
            caixaId: vendaValidada.caixaId,
            tipo: 'VENDA',
            valor: totalPago,
            usuarioId,
            terminal: vendaValidada.terminal,
            descricao: `Venda ${venda.numero || venda.id}`,
          },
        });
      }

      return venda;
    });
  }

  async listarVendas(usuarioId?: string, filtros: { status?: string; origem?: string; inicio?: string; fim?: string; clienteId?: string } = {}) {
    try {
      return await prisma.venda.findMany({
        where: {
          ...(usuarioId ? { usuarioId } : {}),
          ...(filtros.status ? { status: filtros.status as any } : {}),
          ...(filtros.origem ? { origem: filtros.origem as any } : {}),
          ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
          ...((filtros.inicio || filtros.fim) ? {
            data: {
              ...(filtros.inicio ? { gte: new Date(filtros.inicio) } : {}),
              ...(filtros.fim ? { lte: new Date(filtros.fim) } : {}),
            },
          } : {}),
        },
        include: { itens: { include: { produto: true } }, cliente: true, usuario: true, pagamentos: true, timeline: true },
        orderBy: { data: 'desc' },
      });
    } catch {
      return [];
    }
  }

  async abrirCaixa(data: unknown, usuarioId: string) {
    return (prisma as any).caixaOperacional.create({
      data: { ...caixaSchema.parse(data), usuarioId },
      include: { usuario: true, movimentos: true },
    });
  }

  async movimentoCaixa(data: unknown, usuarioId: string) {
    return (prisma as any).movimentoCaixa.create({
      data: { ...movimentoCaixaSchema.parse(data), usuarioId },
    });
  }

  async listarCaixas(usuarioId?: string) {
    try {
      return await (prisma as any).caixaOperacional.findMany({
        where: usuarioId ? { usuarioId } : {},
        include: { usuario: true, movimentos: true, vendas: true },
        orderBy: { abertoEm: 'desc' },
      });
    } catch {
      return [];
    }
  }

  async listarMovimentosCaixa() {
    try {
      return await (prisma as any).movimentoCaixa.findMany({
        include: { caixa: true, usuario: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
    } catch {
      return [];
    }
  }

  async criarListaPreco(data: unknown) {
    const lista = listaPrecoSchema.parse(data);
    return (prisma as any).listaPreco.create({
      data: {
        ...lista,
        itens: { create: lista.itens },
      },
      include: { itens: { include: { produto: true } } },
    });
  }

  async listarListasPreco() {
    try {
      return await (prisma as any).listaPreco.findMany({
        include: { itens: { include: { produto: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      return [];
    }
  }

  async criarOrcamento(data: unknown, usuarioId: string) {
    const orcamento = orcamentoSchema.parse(data);
    return (prisma as any).orcamentoVenda.create({
      data: { ...orcamento, usuarioId, numero: orcamento.numero || `ORC-${Date.now()}` },
      include: { cliente: true, usuario: true },
    });
  }

  async listarOrcamentos(usuarioId?: string) {
    try {
      return await (prisma as any).orcamentoVenda.findMany({
        where: usuarioId ? { usuarioId } : {},
        include: { cliente: true, usuario: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
    } catch {
      return [];
    }
  }

  async listarFormasRecebimento() {
    let formasFinanceiras: Array<{
      id: string;
      nome: string;
      tipo: string;
      taxaPercentual: number;
      taxaFixa: number;
      prazoRecebimentoDias: number;
      permiteParcelamento: number;
      permiteAntecipacao: number;
      ativo: number;
    }> = [];

    try {
      formasFinanceiras = await prisma.$queryRaw<Array<{
        id: string;
        nome: string;
        tipo: string;
        taxaPercentual: number;
        taxaFixa: number;
        prazoRecebimentoDias: number;
        permiteParcelamento: number;
        permiteAntecipacao: number;
        ativo: number;
      }>>`
        SELECT id, nome, tipo, taxaPercentual, taxaFixa, prazoRecebimentoDias, permiteParcelamento, permiteAntecipacao, ativo
        FROM FormaPagamentoFinanceira
        ORDER BY nome ASC
      `;
    } catch {
      formasFinanceiras = [];
    }

    if (formasFinanceiras.length > 0) {
      return formasFinanceiras.map((forma) => ({
        id: forma.id,
        nome: forma.nome,
        tipo: forma.tipo,
        taxaPercentual: Number(forma.taxaPercentual || 0),
        taxaFixa: Number(forma.taxaFixa || 0),
        prazoRecebimentoDias: Number(forma.prazoRecebimentoDias || 0),
        permiteParcelamento: Boolean(forma.permiteParcelamento),
        permiteAntecipacao: Boolean(forma.permiteAntecipacao),
        ativo: Boolean(forma.ativo),
      }));
    }

    try {
      const porUso = await prisma.$queryRaw<Array<{ forma: string; quantidade: bigint | number; valor: number }>>`
        SELECT forma, COUNT(*) AS quantidade, COALESCE(SUM(valor), 0) AS valor
        FROM PagamentoVenda
        GROUP BY forma
        ORDER BY quantidade DESC
      `;

      return porUso.map((item) => ({
        id: item.forma,
        nome: item.forma,
        tipo: item.forma,
        taxaPercentual: 0,
        taxaFixa: 0,
        prazoRecebimentoDias: 0,
        permiteParcelamento: ['CREDITO', 'CREDIARIO'].includes(item.forma),
        permiteAntecipacao: item.forma === 'CREDITO',
        ativo: true,
        usoQuantidade: Number(item.quantidade),
        usoValor: Number(item.valor || 0),
      }));
    } catch {
      return [
        { id: 'PIX', nome: 'PIX', tipo: 'PIX', taxaPercentual: 0, taxaFixa: 0, prazoRecebimentoDias: 0, permiteParcelamento: false, permiteAntecipacao: false, ativo: true },
        { id: 'CREDITO', nome: 'Credito', tipo: 'CREDITO', taxaPercentual: 0, taxaFixa: 0, prazoRecebimentoDias: 30, permiteParcelamento: true, permiteAntecipacao: true, ativo: true },
        { id: 'DEBITO', nome: 'Debito', tipo: 'DEBITO', taxaPercentual: 0, taxaFixa: 0, prazoRecebimentoDias: 1, permiteParcelamento: false, permiteAntecipacao: false, ativo: true },
        { id: 'DINHEIRO', nome: 'Dinheiro', tipo: 'DINHEIRO', taxaPercentual: 0, taxaFixa: 0, prazoRecebimentoDias: 0, permiteParcelamento: false, permiteAntecipacao: false, ativo: true },
        { id: 'BOLETO', nome: 'Boleto', tipo: 'BOLETO', taxaPercentual: 0, taxaFixa: 0, prazoRecebimentoDias: 3, permiteParcelamento: false, permiteAntecipacao: false, ativo: true },
      ];
    }
  }

  async modeloDemonstrativo(periodoDias = 30) {
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - periodoDias);

    let vendas: { _sum: { total: number | null; lucro: number | null; descontoTotal: number | null; frete: number | null } };
    let topCanais: Array<{ canal: string | null; quantidade: bigint | number; total: number }>;

    try {
      [vendas, topCanais] = await Promise.all([
        prisma.venda.aggregate({
          where: { data: { gte: inicio }, status: { not: 'CANCELADO' as any } },
          _sum: { total: true, lucro: true, descontoTotal: true, frete: true },
        }),
        prisma.$queryRaw<Array<{ canal: string | null; quantidade: bigint | number; total: number }>>`
          SELECT canal, COUNT(*) AS quantidade, COALESCE(SUM(total), 0) AS total
          FROM Venda
          WHERE data >= ${inicio} AND status <> 'CANCELADO'
          GROUP BY canal
          ORDER BY total DESC
          LIMIT 6
        `,
      ]);
    } catch {
      return {
        periodoDias,
        receita: 0,
        lucro: 0,
        margem: 0,
        descontoTotal: 0,
        freteTotal: 0,
        receitaFinanceira: 0,
        despesaFinanceira: 0,
        canais: [],
      };
    }

    let receitaFinanceira = 0;
    let despesaFinanceira = 0;

    try {
      const [lancamentosReceita, lancamentosDespesa] = await Promise.all([
        (prisma as any).lancamentoFinanceiro.aggregate({
          where: { competencia: { gte: inicio }, tipo: 'RECEITA' },
          _sum: { valorLiquido: true },
        }),
        (prisma as any).lancamentoFinanceiro.aggregate({
          where: { competencia: { gte: inicio }, tipo: 'DESPESA' },
          _sum: { valorLiquido: true },
        }),
      ]);
      receitaFinanceira = Number(lancamentosReceita._sum.valorLiquido || 0);
      despesaFinanceira = Number(lancamentosDespesa._sum.valorLiquido || 0);
    } catch {
      receitaFinanceira = 0;
      despesaFinanceira = 0;
    }

    const receita = Number(vendas._sum.total || 0);
    const lucro = Number(vendas._sum.lucro || 0);
    const margem = receita > 0 ? Number(((lucro / receita) * 100).toFixed(2)) : 0;

    return {
      periodoDias,
      receita,
      lucro,
      margem,
      descontoTotal: Number(vendas._sum.descontoTotal || 0),
      freteTotal: Number(vendas._sum.frete || 0),
      receitaFinanceira,
      despesaFinanceira,
      canais: topCanais.map((canal) => ({
        canal: canal.canal || 'Sem canal',
        quantidade: Number(canal.quantidade),
        total: Number(canal.total || 0),
      })),
    };
  }

  async obterConfiguracaoVendas() {
    const rows = await prisma.$queryRaw<Array<{
      id: string;
      descontoMaximo: number;
      comissaoPadrao: number;
      validadeOrcamentoDias: number;
      permitirVendaOffline: number;
      exigirAprovacaoDesconto: number;
      nfeAutomatica: number;
      sincronizarMarketplace: number;
      atualizarEstoqueMarketplace: number;
      atualizarPrecoMarketplace: number;
      jurosMensal: number;
      multaAtraso: number;
      prazoRecebimentoPadrao: number;
      updatedAt: Date;
    }>>`
      SELECT id, descontoMaximo, comissaoPadrao, validadeOrcamentoDias, permitirVendaOffline,
             exigirAprovacaoDesconto, nfeAutomatica, sincronizarMarketplace, atualizarEstoqueMarketplace,
             atualizarPrecoMarketplace, jurosMensal, multaAtraso, prazoRecebimentoPadrao, updatedAt
      FROM ConfiguracaoVendas
      WHERE escopo = 'GLOBAL'
      LIMIT 1
    `;

    if (rows.length === 0) {
      return configuracaoVendasSchema.parse({});
    }

    const row = rows[0];
    return {
      id: row.id,
      descontoMaximo: Number(row.descontoMaximo),
      comissaoPadrao: Number(row.comissaoPadrao),
      validadeOrcamentoDias: Number(row.validadeOrcamentoDias),
      permitirVendaOffline: Boolean(row.permitirVendaOffline),
      exigirAprovacaoDesconto: Boolean(row.exigirAprovacaoDesconto),
      nfeAutomatica: Boolean(row.nfeAutomatica),
      sincronizarMarketplace: Boolean(row.sincronizarMarketplace),
      atualizarEstoqueMarketplace: Boolean(row.atualizarEstoqueMarketplace),
      atualizarPrecoMarketplace: Boolean(row.atualizarPrecoMarketplace),
      jurosMensal: Number(row.jurosMensal),
      multaAtraso: Number(row.multaAtraso),
      prazoRecebimentoPadrao: Number(row.prazoRecebimentoPadrao),
      updatedAt: row.updatedAt,
    };
  }

  async salvarConfiguracaoVendas(data: unknown, userId: string) {
    const config = configuracaoVendasSchema.parse(data);
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO ConfiguracaoVendas (
        id, escopo, descontoMaximo, comissaoPadrao, validadeOrcamentoDias,
        permitirVendaOffline, exigirAprovacaoDesconto, nfeAutomatica,
        sincronizarMarketplace, atualizarEstoqueMarketplace, atualizarPrecoMarketplace,
        jurosMensal, multaAtraso, prazoRecebimentoPadrao, updatedByUserId, createdAt, updatedAt
      )
      VALUES (
        UUID(), 'GLOBAL', ${config.descontoMaximo}, ${config.comissaoPadrao}, ${config.validadeOrcamentoDias},
        ${config.permitirVendaOffline}, ${config.exigirAprovacaoDesconto}, ${config.nfeAutomatica},
        ${config.sincronizarMarketplace}, ${config.atualizarEstoqueMarketplace}, ${config.atualizarPrecoMarketplace},
        ${config.jurosMensal}, ${config.multaAtraso}, ${config.prazoRecebimentoPadrao}, ${userId}, ${now}, ${now}
      )
      ON DUPLICATE KEY UPDATE
        descontoMaximo = VALUES(descontoMaximo),
        comissaoPadrao = VALUES(comissaoPadrao),
        validadeOrcamentoDias = VALUES(validadeOrcamentoDias),
        permitirVendaOffline = VALUES(permitirVendaOffline),
        exigirAprovacaoDesconto = VALUES(exigirAprovacaoDesconto),
        nfeAutomatica = VALUES(nfeAutomatica),
        sincronizarMarketplace = VALUES(sincronizarMarketplace),
        atualizarEstoqueMarketplace = VALUES(atualizarEstoqueMarketplace),
        atualizarPrecoMarketplace = VALUES(atualizarPrecoMarketplace),
        jurosMensal = VALUES(jurosMensal),
        multaAtraso = VALUES(multaAtraso),
        prazoRecebimentoPadrao = VALUES(prazoRecebimentoPadrao),
        updatedByUserId = VALUES(updatedByUserId),
        updatedAt = VALUES(updatedAt)
    `;

    return this.obterConfiguracaoVendas();
  }

  async rankingClientes() {
    const vendas = await prisma.venda.groupBy({
      by: ['clienteId'],
      where: { clienteId: { not: null }, status: { not: 'CANCELADO' as any } },
      _sum: { total: true, lucro: true },
      _count: { _all: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 10,
    });

    const clientes = await prisma.cliente.findMany({
      where: { id: { in: vendas.map((venda) => venda.clienteId).filter(Boolean) as string[] } },
    });
    const clientesPorId = new Map(clientes.map((cliente) => [cliente.id, cliente]));

    return vendas.map((venda) => {
      const faturamento = venda._sum.total || 0;
      const frequencia = venda._count._all || 0;
      return {
        cliente: clientesPorId.get(venda.clienteId || '')?.nome || 'Cliente sem cadastro',
        clienteId: venda.clienteId,
        faturamento,
        lucro: venda._sum.lucro || 0,
        frequencia,
        ticketMedio: frequencia ? faturamento / frequencia : 0,
        classificacao: faturamento >= 5000 ? 'OURO' : faturamento >= 1500 ? 'PRATA' : 'BRONZE',
      };
    });
  }

  async saldoClientes() {
    try {
      return await (prisma as any).clienteSaldo.findMany({
        include: { cliente: true },
        orderBy: { updatedAt: 'desc' },
      });
    } catch {
      return [];
    }
  }

  async dashboardVendas() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const [vendasHoje, totalVendas, receitaTotal, lucroTotal, pedidosAbertos, produtosMaisVendidos] = await Promise.all([
      prisma.venda.count({ where: { data: { gte: hoje } } }),
      prisma.venda.count(),
      prisma.venda.aggregate({ _sum: { total: true } }),
      prisma.venda.aggregate({ _sum: { lucro: true } }),
      prisma.venda.count({ where: { status: { in: ['AGUARDANDO_PAGAMENTO', 'PAGO', 'SEPARADO'] as any } } }),
      prisma.itemVenda.groupBy({
        by: ['produtoId'],
        _sum: { quantidade: true, total: true },
        orderBy: { _sum: { quantidade: 'desc' } },
        take: 5,
      }),
    ]);

    const produtosComNomes = await Promise.all(
      produtosMaisVendidos.map(async (item) => {
        const produto = await prisma.produto.findUnique({ where: { id: item.produtoId }, select: { nome: true } });
        return { produto: produto?.nome || 'Produto nao encontrado', quantidade: item._sum.quantidade || 0, total: item._sum.total || 0 };
      }),
    );

    return {
      vendasHoje,
      totalVendas,
      pedidosAbertos,
      receitaTotal: receitaTotal._sum.total || 0,
      lucroTotal: lucroTotal._sum.lucro || 0,
      margemMedia: receitaTotal._sum.total ? Number((((lucroTotal._sum.lucro || 0) / (receitaTotal._sum.total || 1)) * 100).toFixed(2)) : 0,
      produtosMaisVendidos: produtosComNomes,
    };
  }

  private mapOrigemFinanceira(origem: string) {
    const map: Record<string, string> = {
      MERCADO_LIVRE: 'MERCADO_LIVRE',
      SHOPEE: 'SHOPEE',
      AMAZON: 'AMAZON',
      MAGAZINE_LUIZA: 'MAGAZINE_LUIZA',
      BLING: 'BLING',
      PDV: 'PDV',
      BALCAO: 'PDV',
      API: 'API',
      MANUAL: 'MANUAL',
      OFFLINE: 'VENDA',
    };
    return map[origem] || 'VENDA';
  }

  private mapOrigemEstoque(origem: string) {
    const map: Record<string, string> = {
      MERCADO_LIVRE: 'MERCADO_LIVRE',
      SHOPEE: 'SHOPEE',
      AMAZON: 'AMAZON',
      MAGAZINE_LUIZA: 'MAGAZINE_LUIZA',
      BLING: 'BLING',
      PDV: 'PDV',
      BALCAO: 'PDV',
      API: 'API',
      MANUAL: 'MANUAL',
      OFFLINE: 'VENDA',
    };
    return map[origem] || 'VENDA';
  }
}
