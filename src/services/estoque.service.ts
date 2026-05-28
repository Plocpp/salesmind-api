import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import prismaClient from "../database/prisma";

const prisma = prismaClient as any;

const grupoSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  cor: z.string().optional(),
  icone: z.string().optional(),
  ncmPadrao: z.string().optional(),
  cestPadrao: z.string().optional(),
  cfopPadrao: z.string().optional(),
  parentId: z.string().optional(),
  empresaId: z.string().optional(),
});

const depositoSchema = z.object({
  nome: z.string().min(1),
  tipo: z.enum(["PROPRIO", "FILIAL", "TERCEIRIZADO", "TRANSITO", "MARKETPLACE"]).default("PROPRIO"),
  codigo: z.string().optional(),
  endereco: z.string().optional(),
  empresaId: z.string().optional(),
});

const tipoMovimentacaoSchema = z.enum([
  "ENTRADA_COMPRA",
  "ENTRADA_DEVOLUCAO",
  "ENTRADA_PRODUCAO",
  "SAIDA_VENDA",
  "SAIDA_PERDA",
  "SAIDA_CONSUMO_INTERNO",
  "SAIDA_AVARIA",
  "SAIDA_DEVOLUCAO_FORNECEDOR",
  "RESERVA",
  "LIBERACAO_RESERVA",
  "TRANSFERENCIA",
  "AJUSTE",
  "INVENTARIO",
]);

const movimentacaoSchema = z.object({
  produtoId: z.string(),
  tipo: tipoMovimentacaoSchema,
  origem: z.enum([
    "MERCADO_LIVRE",
    "SHOPEE",
    "AMAZON",
    "MAGAZINE_LUIZA",
    "BLING",
    "PDV",
    "ERP",
    "MANUAL",
    "API",
    "COMPRA",
    "VENDA",
    "INVENTARIO",
    "WEBHOOK",
  ]).default("MANUAL"),
  quantidade: z.number().positive(),
  custoUnitario: z.number().nonnegative().optional(),
  motivo: z.string().optional(),
  observacoes: z.string().optional(),
  lote: z.string().optional(),
  numeroSerie: z.string().optional(),
  validade: z.coerce.date().optional(),
  origemReferencia: z.string().optional(),
  depositoOrigemId: z.string().optional(),
  depositoDestinoId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const pedidoCompraSchema = z.object({
  numero: z.string().optional(),
  fornecedorId: z.string(),
  empresaId: z.string().optional(),
  previsao: z.coerce.date().optional(),
  valorFrete: z.number().nonnegative().default(0),
  valorImpostos: z.number().nonnegative().default(0),
  observacoes: z.string().optional(),
  itens: z.array(z.object({
    produtoId: z.string(),
    quantidade: z.number().positive(),
    custoUnitario: z.number().nonnegative(),
    ncm: z.string().optional(),
    cfop: z.string().optional(),
    lote: z.string().optional(),
    validade: z.coerce.date().optional(),
  })).min(1),
});

const inventarioSchema = z.object({
  tipo: z.enum(["GERAL", "ROTATIVO", "CICLICO"]).default("GERAL"),
  descricao: z.string().optional(),
  empresaId: z.string().optional(),
  depositoId: z.string().optional(),
  dispositivo: z.string().optional(),
  itens: z.array(z.object({
    produtoId: z.string(),
    quantidadeSistema: z.number().nonnegative(),
    quantidadeContada: z.number().nonnegative(),
    observacoes: z.string().optional(),
  })).default([]),
});

const recebimentoNfeCompraSchema = z.object({
  pedidoCompraId: z.string(),
  numero: z.string().min(1),
  serie: z.string().default("1"),
  chaveAcesso: z.string().min(32).max(60),
  dataEmissao: z.coerce.date(),
  dataEntrada: z.coerce.date().default(() => new Date()),
  valorFrete: z.number().nonnegative().default(0),
  valorImpostos: z.number().nonnegative().default(0),
  observacoes: z.string().optional(),
  itens: z.array(z.object({
    produtoId: z.string(),
    quantidadeRecebida: z.number().positive(),
    custoUnitario: z.number().nonnegative().optional(),
    depositoDestinoId: z.string().optional(),
  })).min(1),
  parcelas: z.array(z.object({
    numeroParcela: z.number().int().positive().optional(),
    valor: z.number().positive(),
    vencimento: z.coerce.date(),
    boleto: z.object({
      linhaDigitavel: z.string().optional(),
      codigoBarras: z.string().optional(),
      nossoNumero: z.string().optional(),
      banco: z.string().optional(),
      urlPdf: z.string().url().optional(),
    }).optional(),
  })).default([]),
});

const tipoCatalogoSchema = z.enum(["PRODUTO", "SERVICO", "PACOTE", "KIT"]);

const criarItemCatalogoSchema = z.object({
  tipo: tipoCatalogoSchema,
  nome: z.string().min(1),
  codigoInterno: z.string().optional(),
  codigoBarras: z.string().optional(),
  unidadeVenda: z.string().min(1),
  grupoId: z.string().min(1),
  marcaId: z.string().min(1),
  custoAtual: z.number().nonnegative().optional(),
  precoVenda: z.number().nonnegative().optional(),
  markupAlvo: z.number().optional(),
  estoqueInicial: z.number().nonnegative().optional(),
});

const atualizarItemCatalogoSchema = z.object({
  nome: z.string().min(1).optional(),
  unidadeVenda: z.string().min(1).optional(),
  grupoId: z.string().min(1).optional(),
  marcaId: z.string().min(1).optional(),
  custoAtual: z.number().nonnegative().optional(),
  precoVenda: z.number().nonnegative().optional(),
  markupAlvo: z.number().optional(),
  codigoInterno: z.string().optional(),
  codigoBarras: z.string().optional(),
  ativo: z.boolean().optional(),
});

const filtrosCatalogoSchema = z.object({
  q: z.string().optional(),
  tipo: tipoCatalogoSchema.optional(),
  grupoId: z.string().optional(),
  marcaId: z.string().optional(),
  ativo: z.boolean().optional(),
  statusEstoque: z.enum(["RUPTURA", "BAIXO", "OK"]).optional(),
  somenteComValidade: z.boolean().optional(),
});

const filtrosPedidoCompraSchema = z.object({
  status: z.string().optional(),
  fornecedorId: z.string().optional(),
  q: z.string().optional(),
  inicio: z.string().optional(),
  fim: z.string().optional(),
});

const sugestaoCompraFiltroSchema = z.object({
  coberturaDias: z.number().int().min(1).max(365).default(30),
  incluirItensSemVenda: z.boolean().default(false),
});

const importarNfeCompraXmlSchema = z.object({
  xml: z.string().min(50),
  depositoDestinoId: z.string().optional(),
  empresaId: z.string().optional(),
  fornecedorFallbackNome: z.string().optional(),
  marcaPadraoNome: z.string().optional(),
  criarProdutosNovos: z.boolean().default(true),
  atualizarCustoProduto: z.boolean().default(true),
});

const previewNfeCompraXmlSchema = z.object({
  xml: z.string().min(50),
});

type XmlCompraItem = {
  nome: string;
  codigoInterno?: string;
  codigoBarras?: string;
  quantidade: number;
  custoUnitario: number;
  valorTotal: number;
  unidade?: string;
  ncm?: string;
  cfop?: string;
  marcaNome?: string;
  lote?: string;
  validade?: Date;
};

type XmlCompraExtraida = {
  numero: string;
  serie: string;
  chaveAcesso: string;
  dataEmissao: Date;
  dataEntrada: Date;
  valorFrete: number;
  valorImpostos: number;
  valorTotal: number;
  fornecedorNome?: string;
  fornecedorCnpj?: string;
  itens: XmlCompraItem[];
  parcelas: Array<{ numeroParcela: number; valor: number; vencimento: Date }>;
};

const mapTipoCatalogoParaProduto = (tipo: z.infer<typeof tipoCatalogoSchema>) => {
  if (tipo === "PRODUTO") return "FISICO";
  if (tipo === "SERVICO") return "SERVICO";
  if (tipo === "PACOTE") return "KIT";
  return "KIT";
};

const mapTipoProdutoParaCatalogo = (tipo: string) => {
  if (tipo === "FISICO") return "PRODUTO";
  if (tipo === "SERVICO") return "SERVICO";
  if (tipo === "KIT") return "KIT";
  return "PRODUTO";
};

export class EstoqueService {
  async listarCatalogoItens(filtros: unknown) {
    const parsed = filtrosCatalogoSchema.parse(filtros || {});

    const produtos = await prisma.produto.findMany({
      where: {
        ...(parsed.ativo === undefined ? {} : { ativo: parsed.ativo }),
        ...(parsed.grupoId ? { grupoProdutoId: parsed.grupoId } : {}),
        ...(parsed.marcaId ? { marcaId: parsed.marcaId } : {}),
        ...(parsed.tipo ? { tipo: mapTipoCatalogoParaProduto(parsed.tipo) } : {}),
        ...(parsed.somenteComValidade ? { validade: { not: null } } : {}),
        ...(parsed.q
          ? {
              OR: [
                { nome: { contains: parsed.q } },
                { codigo: { contains: parsed.q } },
                { codigoBarras: { contains: parsed.q } },
                { sku: { contains: parsed.q } },
              ],
            }
          : {}),
      },
      include: {
        marca: true,
        grupoProduto: true,
      },
      orderBy: { nome: "asc" },
    });

    const itens = produtos.map((produto: any) => this.toCatalogoItem(produto));

    if (!parsed.statusEstoque) {
      return itens;
    }

    return itens.filter((item: any) => {
      const minimo = Number(item.estoqueMinimo || 0);
      if (parsed.statusEstoque === "RUPTURA") return Number(item.estoqueAtual || 0) <= 0;
      if (parsed.statusEstoque === "BAIXO") return Number(item.estoqueAtual || 0) > 0 && Number(item.estoqueAtual || 0) <= minimo;
      return Number(item.estoqueAtual || 0) > minimo;
    });
  }

  async atalhosOperacionais() {
    return {
      origem: "Referencia publica Simples.Vet + adaptacao operacional SalesMind",
      atualizadoEm: new Date().toISOString(),
      atalhos: [
        {
          codigo: "EST-AT-01",
          titulo: "Pesquisar catalogo",
          rota: "/estoque/catalogo/itens?q=",
          acaoRapida: "Buscar por nome, codigo interno, codigo de barras ou SKU em um unico campo.",
        },
        {
          codigo: "EST-AT-02",
          titulo: "Conferir validade critica",
          rota: "/estoque/catalogo/indicadores-validade?janelaDias=60",
          acaoRapida: "Listar vencidos e vencendo com janela configuravel para priorizar escoamento.",
        },
        {
          codigo: "EST-AT-03",
          titulo: "Gerar sugestao de compra",
          rota: "/estoque/compras/sugestoes?coberturaDias=30",
          acaoRapida: "Calcular necessidade por giro e estoque minimo para reposicao rapida.",
        },
        {
          codigo: "EST-AT-04",
          titulo: "Filtrar pedidos de compra",
          rota: "/estoque/compras/pedidos?status=ABERTO&q=",
          acaoRapida: "Pesquisar pedidos por numero/fornecedor e filtrar por periodo.",
        },
        {
          codigo: "EST-AT-05",
          titulo: "Itens em ruptura",
          rota: "/estoque/catalogo/itens?statusEstoque=RUPTURA",
          acaoRapida: "Ver rapidamente itens sem disponibilidade para acionar compra.",
        },
        {
          codigo: "EST-AT-06",
          titulo: "Itens com estoque baixo",
          rota: "/estoque/catalogo/itens?statusEstoque=BAIXO",
          acaoRapida: "Listar itens com saldo disponivel ate o estoque minimo para priorizar reposicao.",
        },
      ],
    };
  }

  async criarItemCatalogo(data: unknown, usuarioId: string) {
    const payload = criarItemCatalogoSchema.parse(data);

    const criado = await prisma.produto.create({
      data: {
        nome: payload.nome,
        tipo: mapTipoCatalogoParaProduto(payload.tipo),
        codigo: payload.codigoInterno,
        codigoBarras: payload.codigoBarras,
        unidadeMedida: payload.unidadeVenda,
        grupoProdutoId: payload.grupoId,
        marcaId: payload.marcaId,
        custoMedio: payload.custoAtual,
        preco: payload.precoVenda || 0,
        markup: payload.markupAlvo,
        margem: payload.markupAlvo,
        estoque: Math.round(payload.estoqueInicial || 0),
        estoqueDisponivel: payload.estoqueInicial || 0,
        peso: 0,
        porte: "NAO_APLICA",
        usuarioId,
      },
      include: {
        marca: true,
        grupoProduto: true,
      },
    });

    return this.toCatalogoItem(criado);
  }

  async atualizarItemCatalogo(id: string, data: unknown) {
    const payload = atualizarItemCatalogoSchema.parse(data);

    const existe = await prisma.produto.findUnique({ where: { id } });
    if (!existe) {
      throw new Error("Item de catalogo nao encontrado");
    }

    const atualizado = await prisma.produto.update({
      where: { id },
      data: {
        ...(payload.nome !== undefined ? { nome: payload.nome } : {}),
        ...(payload.unidadeVenda !== undefined ? { unidadeMedida: payload.unidadeVenda } : {}),
        ...(payload.grupoId !== undefined ? { grupoProdutoId: payload.grupoId } : {}),
        ...(payload.marcaId !== undefined ? { marcaId: payload.marcaId } : {}),
        ...(payload.custoAtual !== undefined ? { custoMedio: payload.custoAtual } : {}),
        ...(payload.precoVenda !== undefined ? { preco: payload.precoVenda } : {}),
        ...(payload.markupAlvo !== undefined ? { markup: payload.markupAlvo, margem: payload.markupAlvo } : {}),
        ...(payload.codigoInterno !== undefined ? { codigo: payload.codigoInterno } : {}),
        ...(payload.codigoBarras !== undefined ? { codigoBarras: payload.codigoBarras } : {}),
        ...(payload.ativo !== undefined ? { ativo: payload.ativo } : {}),
      },
      include: {
        marca: true,
        grupoProduto: true,
      },
    });

    return this.toCatalogoItem(atualizado);
  }

  async indicadoresValidade(janelaDias = 60) {
    const hoje = new Date();
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + janelaDias);

    const produtos = await prisma.produto.findMany({
      where: {
        ativo: true,
        validade: { not: null },
      },
      include: {
        marca: true,
        grupoProduto: true,
      },
      orderBy: { validade: "asc" },
    });

    const itensCriticos = produtos.filter((produto: any) => {
      const validade = produto.validade ? new Date(produto.validade) : null;
      if (!validade) return false;
      return validade <= limite;
    }).map((produto: any) => this.toCatalogoItem(produto, janelaDias));

    const vencidos = itensCriticos.filter((item: any) => item.statusValidade === "VENCIDO").length;
    const vencendo = itensCriticos.filter((item: any) => item.statusValidade === "VENCENDO").length;

    return {
      vencidos,
      vencendo,
      janelaDias,
      itensCriticos,
    };
  }

  async sugestoesCompra(filtros: unknown) {
    const parsed = sugestaoCompraFiltroSchema.parse(filtros || {});
    const inicioJanela = new Date();
    inicioJanela.setDate(inicioJanela.getDate() - 30);

    const produtos = await prisma.produto.findMany({
      where: {
        ativo: true,
        tipo: { in: ["FISICO", "KIT"] },
      },
      orderBy: { nome: "asc" },
    });

    if (produtos.length === 0) {
      return [];
    }

    const vendas30Dias = await prisma.itemVenda.findMany({
      where: {
        produtoId: { in: produtos.map((produto: any) => produto.id) },
        venda: {
          data: { gte: inicioJanela },
          status: { notIn: ["CANCELADO", "ESTORNADO"] },
        },
      },
      select: {
        produtoId: true,
        quantidade: true,
      },
    });

    const vendasPorProduto = vendas30Dias.reduce<Record<string, number>>((acc, item: any) => {
      const atual = acc[item.produtoId] || 0;
      acc[item.produtoId] = atual + Number(item.quantidade || 0);
      return acc;
    }, {});

    const sugestoes = produtos.map((produto: any) => {
      const vendido30Dias = Number(vendasPorProduto[produto.id] || 0);
      const consumoMedioDiario = vendido30Dias / 30;
      const coberturaNecessaria = consumoMedioDiario * parsed.coberturaDias;
      const estoqueAtual = Number(produto.estoqueDisponivel || produto.estoque || 0);
      const estoqueMinimo = Number(produto.estoqueMinimo || 0);
      const alvo = Math.max(estoqueMinimo, coberturaNecessaria);
      const quantidadeSugerida = Math.max(0, Number((alvo - estoqueAtual).toFixed(2)));

      return {
        itemId: produto.id,
        nomeItem: produto.nome,
        estoqueAtual,
        estoqueMinimo,
        coberturaDias: parsed.coberturaDias,
        quantidadeSugerida,
        justificativa: `Consumo medio 30d: ${consumoMedioDiario.toFixed(2)}/dia; alvo ${alvo.toFixed(2)}; estoque atual ${estoqueAtual.toFixed(2)}.`,
      };
    });

    return sugestoes.filter((item) => {
      if (item.quantidadeSugerida > 0) return true;
      if (!parsed.incluirItensSemVenda) return false;
      return item.estoqueAtual <= item.estoqueMinimo;
    });
  }

  async criarGrupo(data: unknown) {
    return prisma.grupoProduto.create({ data: grupoSchema.parse(data) });
  }

  async listarGrupos(empresaId?: string) {
    return prisma.grupoProduto.findMany({
      where: empresaId ? { empresaId } : {},
      include: { parent: true, children: true },
      orderBy: { nome: "asc" },
    });
  }

  async criarDeposito(data: unknown) {
    return prisma.depositoEstoque.create({ data: depositoSchema.parse(data) });
  }

  async listarDepositos(empresaId?: string) {
    return prisma.depositoEstoque.findMany({
      where: empresaId ? { empresaId, ativo: true } : { ativo: true },
      orderBy: { nome: "asc" },
    });
  }

  async movimentar(data: unknown, usuarioId?: string) {
    const movimentacao = movimentacaoSchema.parse(data);
    const valorTotal = movimentacao.custoUnitario ? movimentacao.custoUnitario * movimentacao.quantidade : undefined;

    return prisma.$transaction(async (tx: any) => {
      const produto = await tx.produto.findUnique({ where: { id: movimentacao.produtoId } });
      if (!produto) {
        throw new Error("Produto nao encontrado");
      }

      if (produto.tipo === "SERVICO" || produto.tipo === "DIGITAL") {
        throw new Error("Produto digital ou servico nao controla estoque fisico");
      }

      await this.aplicarSaldo(tx, movimentacao);

      const criada = await tx.movimentacaoEstoque.create({
        data: {
          ...movimentacao,
          valorTotal,
          usuarioId,
        },
      });

      await this.auditar(tx, "MovimentacaoEstoque", criada.id, "MOVIMENTACAO", usuarioId, null, criada);
      return criada;
    });
  }

  async reservar(produtoId: string, quantidade: number, origemReferencia?: string, usuarioId?: string, depositoOrigemId?: string) {
    return this.movimentar({
      produtoId,
      quantidade,
      tipo: "RESERVA",
      origem: "API",
      origemReferencia,
      depositoOrigemId,
      motivo: "Reserva de pedido",
    }, usuarioId);
  }

  async liberarReserva(produtoId: string, quantidade: number, origemReferencia?: string, usuarioId?: string, depositoOrigemId?: string) {
    return this.movimentar({
      produtoId,
      quantidade,
      tipo: "LIBERACAO_RESERVA",
      origem: "API",
      origemReferencia,
      depositoOrigemId,
      motivo: "Liberacao de reserva",
    }, usuarioId);
  }

  async listarSaldos(filtros: { produtoId?: string; depositoId?: string; q?: string; abaixoMinimo?: boolean; comReserva?: boolean }) {
    const saldos = await prisma.produtoEstoque.findMany({
      where: {
        ...(filtros.produtoId ? { produtoId: filtros.produtoId } : {}),
        ...(filtros.depositoId ? { depositoId: filtros.depositoId } : {}),
        ...(filtros.comReserva ? { estoqueReservado: { gt: 0 } } : {}),
        ...(filtros.q
          ? {
              produto: {
                OR: [
                  { nome: { contains: filtros.q } },
                  { codigo: { contains: filtros.q } },
                  { codigoBarras: { contains: filtros.q } },
                  { sku: { contains: filtros.q } },
                ],
              },
            }
          : {}),
      },
      include: { produto: true, deposito: true },
      orderBy: { updatedAt: "desc" },
    });

    if (!filtros.abaixoMinimo) {
      return saldos;
    }

    return saldos.filter((saldo: any) => Number(saldo.estoqueDisponivel || 0) <= Number(saldo.produto?.estoqueMinimo || 0));
  }

  async analise(empresaId?: string) {
    const produtos = await prisma.produto.findMany({
      where: { ativo: true },
      include: { marca: true, grupoProduto: true, estoques: true },
    });

    const itens = produtos.map((produto: any) => {
      const fisico = produto.estoques.reduce((total: number, saldo: any) => total + Number(saldo.estoqueFisico || 0), Number(produto.estoque || 0));
      const reservado = produto.estoques.reduce((total: number, saldo: any) => total + Number(saldo.estoqueReservado || 0), Number(produto.estoqueReservado || 0));
      const disponivel = fisico - reservado;

      return {
        id: produto.id,
        nome: produto.nome,
        sku: produto.sku,
        marca: produto.marca?.nome,
        grupo: produto.grupoProduto?.nome,
        fisico,
        reservado,
        disponivel,
        minimo: Number(produto.estoqueMinimo || 0),
        ruptura: disponivel <= 0,
        baixoEstoque: disponivel > 0 && disponivel <= Number(produto.estoqueMinimo || 0),
      };
    });

    return {
      totalProdutos: itens.length,
      rupturas: itens.filter((item: any) => item.ruptura),
      baixoEstoque: itens.filter((item: any) => item.baixoEstoque),
      valorEstoque: produtos.reduce((total: number, produto: any) => total + Number(produto.custoMedio || 0) * Number(produto.estoque || 0), 0),
      itens,
      empresaId,
    };
  }

  async criarPedidoCompra(data: unknown) {
    const pedido = pedidoCompraSchema.parse(data);
    const valorProdutos = pedido.itens.reduce((total, item) => total + item.quantidade * item.custoUnitario, 0);
    const valorTotal = valorProdutos + pedido.valorFrete + pedido.valorImpostos;

    return prisma.pedidoCompra.create({
      data: {
        numero: pedido.numero,
        fornecedorId: pedido.fornecedorId,
        empresaId: pedido.empresaId,
        previsao: pedido.previsao,
        valorFrete: pedido.valorFrete,
        valorImpostos: pedido.valorImpostos,
        valorProdutos,
        valorTotal,
        observacoes: pedido.observacoes,
        itens: {
          create: pedido.itens.map((item) => ({
            ...item,
            valorTotal: item.quantidade * item.custoUnitario,
          })),
        },
      },
      include: { itens: { include: { produto: true } }, fornecedor: true },
    });
  }

  async listarPedidosCompra(filtros: unknown = {}) {
    const parsed = filtrosPedidoCompraSchema.parse(filtros || {});

    return prisma.pedidoCompra.findMany({
      where: {
        ...(parsed.status ? { status: parsed.status as any } : {}),
        ...(parsed.fornecedorId ? { fornecedorId: parsed.fornecedorId } : {}),
        ...(parsed.inicio || parsed.fim
          ? {
              createdAt: {
                ...(parsed.inicio ? { gte: new Date(parsed.inicio) } : {}),
                ...(parsed.fim ? { lte: new Date(parsed.fim) } : {}),
              },
            }
          : {}),
        ...(parsed.q
          ? {
              OR: [
                { numero: { contains: parsed.q } },
                { fornecedor: { nome: { contains: parsed.q } } },
              ],
            }
          : {}),
      },
      include: { fornecedor: true, itens: { include: { produto: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async receberNotaFiscalCompra(data: unknown, usuarioId?: string) {
    const payload = recebimentoNfeCompraSchema.parse(data);

    return prisma.$transaction(async (tx: any) => {
      const pedido = await tx.pedidoCompra.findUnique({
        where: { id: payload.pedidoCompraId },
        include: { itens: true, fornecedor: true },
      });

      if (!pedido) {
        throw new Error("Pedido de compra nao encontrado");
      }

      if (["CANCELADO", "RECEBIDO"].includes(String(pedido.status || ""))) {
        throw new Error("Pedido de compra nao pode receber nota fiscal neste status");
      }

      const itensPedidoPorProduto = new Map((pedido.itens || []).map((item: any) => [item.produtoId, item]));

      let valorProdutos = 0;
      let totalRecebidoNoLote = 0;

      for (const itemRecebido of payload.itens) {
        const itemPedido = itensPedidoPorProduto.get(itemRecebido.produtoId);
        if (!itemPedido) {
          throw new Error(`Produto ${itemRecebido.produtoId} nao pertence ao pedido de compra`);
        }

        const pendente = Number(itemPedido.quantidade || 0) - Number(itemPedido.quantidadeRecebida || 0);
        if (itemRecebido.quantidadeRecebida > pendente) {
          throw new Error(`Quantidade recebida maior que o pendente para o produto ${itemRecebido.produtoId}`);
        }

        const custoUnitario = itemRecebido.custoUnitario ?? Number(itemPedido.custoUnitario || 0);
        const valorTotalItem = Number((custoUnitario * itemRecebido.quantidadeRecebida).toFixed(2));
        valorProdutos += valorTotalItem;
        totalRecebidoNoLote += itemRecebido.quantidadeRecebida;

        if (itemRecebido.depositoDestinoId) {
          await this.garantirSaldo(tx, itemRecebido.produtoId, itemRecebido.depositoDestinoId);
        }

        await this.alterarFisico(tx, itemRecebido.produtoId, itemRecebido.depositoDestinoId, itemRecebido.quantidadeRecebida);

        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: itemRecebido.produtoId,
            tipo: "ENTRADA_COMPRA",
            status: "CONCLUIDA",
            origem: "COMPRA",
            quantidade: itemRecebido.quantidadeRecebida,
            custoUnitario,
            valorTotal: valorTotalItem,
            origemReferencia: pedido.id,
            depositoDestinoId: itemRecebido.depositoDestinoId,
            usuarioId,
            motivo: `Recebimento NF-e ${payload.numero}/${payload.serie}`,
            metadata: {
              pedidoCompraId: pedido.id,
              notaFiscal: {
                numero: payload.numero,
                serie: payload.serie,
                chaveAcesso: payload.chaveAcesso,
              },
            },
          },
        });

        await tx.pedidoCompraItem.update({
          where: { id: itemPedido.id },
          data: {
            quantidadeRecebida: {
              increment: itemRecebido.quantidadeRecebida,
            },
          },
        });
      }

      const pedidoAtualizado = await tx.pedidoCompra.findUnique({
        where: { id: pedido.id },
        include: { itens: true },
      });

      const recebeuTudo = (pedidoAtualizado?.itens || []).every((item: any) => Number(item.quantidadeRecebida || 0) >= Number(item.quantidade || 0));
      const novoStatus = recebeuTudo ? "RECEBIDO" : "RECEBIDO_PARCIAL";
      const valorTotal = Number((valorProdutos + payload.valorFrete + payload.valorImpostos).toFixed(2));

      const metadataAtual = (pedido.metadata && typeof pedido.metadata === "object" && !Array.isArray(pedido.metadata))
        ? pedido.metadata
        : {};
      const notasEntradaHistorico = Array.isArray((metadataAtual as any).notasEntrada)
        ? (metadataAtual as any).notasEntrada
        : [];

      const notaEntrada = {
        numero: payload.numero,
        serie: payload.serie,
        chaveAcesso: payload.chaveAcesso,
        dataEmissao: payload.dataEmissao.toISOString(),
        dataEntrada: payload.dataEntrada.toISOString(),
        valorProdutos,
        valorFrete: payload.valorFrete,
        valorImpostos: payload.valorImpostos,
        valorTotal,
        observacoes: payload.observacoes || null,
        itens: payload.itens,
        parcelas: payload.parcelas,
        recebidaPor: usuarioId || null,
      };

      const pedidoFinal = await tx.pedidoCompra.update({
        where: { id: pedido.id },
        data: {
          status: novoStatus,
          dataCompra: pedido.dataCompra || payload.dataEmissao,
          dataRecebimento: payload.dataEntrada,
          valorProdutos,
          valorFrete: payload.valorFrete,
          valorImpostos: payload.valorImpostos,
          valorTotal,
          metadata: {
            ...(metadataAtual as any),
            notasEntrada: [...notasEntradaHistorico, notaEntrada],
            ultimaNotaEntrada: notaEntrada,
          },
        },
        include: { itens: true, fornecedor: true },
      });

      const parcelas = payload.parcelas.length > 0
        ? payload.parcelas
        : [{ numeroParcela: 1, valor: valorTotal, vencimento: payload.dataEntrada }];

      for (let index = 0; index < parcelas.length; index += 1) {
        const parcela = parcelas[index];
        await tx.lancamentoFinanceiro.create({
          data: {
            descricao: `NF-e compra ${payload.numero}/${payload.serie} - Parcela ${parcela.numeroParcela || index + 1}`,
            tipo: "DESPESA",
            status: "PENDENTE",
            valorBruto: parcela.valor,
            valorLiquido: parcela.valor,
            valorPago: 0,
            competencia: payload.dataEntrada,
            vencimento: parcela.vencimento,
            origem: "ERP",
            origemReferencia: `NFE_ENTRADA:${pedido.id}:${payload.numero}`,
            empresaId: pedido.empresaId || undefined,
            fornecedorId: pedido.fornecedorId,
            usuarioId,
            metadata: {
              tipoDocumento: "NFE_ENTRADA",
              pedidoCompraId: pedido.id,
              notaFiscal: {
                numero: payload.numero,
                serie: payload.serie,
                chaveAcesso: payload.chaveAcesso,
              },
              boleto: parcela.boleto || null,
            },
          },
        });
      }

      await this.auditar(tx, "PedidoCompra", pedido.id, "COMPRA", usuarioId, pedido, pedidoFinal);

      return {
        message: "NF-e de compra recebida e vinculada com estoque e financeiro.",
        pedidoCompra: pedidoFinal,
        totalRecebidoNoLote,
        notaEntrada,
      };
    });
  }

  async importarNotaFiscalCompraXml(data: unknown, usuarioId: string) {
    const payload = importarNfeCompraXmlSchema.parse(data);
    const extraida = this.extrairCompraDeXml(payload.xml);

    if (extraida.itens.length === 0) {
      throw new Error("Nenhum item de produto foi encontrado no XML da NF-e");
    }

    const empresaAtiva = payload.empresaId
      ? { id: payload.empresaId }
      : await prisma.empresa.findFirst({ where: { ativo: true }, select: { id: true }, orderBy: { createdAt: "asc" } });

    const fornecedorResultado = await this.obterOuCriarFornecedorXml(extraida, payload.fornecedorFallbackNome);
    const cacheMarcas = new Map<string, { id: string; created: boolean }>();

    let marcasCriadas = 0;
    let produtosCriados = 0;
    let produtosAtualizados = 0;

    const itensPedido = [] as Array<{
      produtoId: string;
      quantidade: number;
      custoUnitario: number;
      ncm?: string;
      cfop?: string;
      lote?: string;
      validade?: Date;
    }>;

    for (const itemXml of extraida.itens) {
      const marcaNome = this.normalizarTexto(itemXml.marcaNome)
        || this.normalizarTexto(payload.marcaPadraoNome)
        || this.normalizarTexto(fornecedorResultado.fornecedor.nome)
        || "Sem marca";

      const marcaResultado = await this.obterOuCriarMarcaXml(marcaNome, fornecedorResultado.fornecedor.id, cacheMarcas);
      if (marcaResultado.created) marcasCriadas += 1;

      const produtoResultado = await this.obterOuCriarProdutoViaXml(itemXml, {
        usuarioId,
        marcaId: marcaResultado.marca.id,
        criarProdutosNovos: payload.criarProdutosNovos,
        atualizarCustoProduto: payload.atualizarCustoProduto,
      });

      if (produtoResultado.created) produtosCriados += 1;
      if (produtoResultado.updated) produtosAtualizados += 1;

      itensPedido.push({
        produtoId: produtoResultado.produto.id,
        quantidade: itemXml.quantidade,
        custoUnitario: itemXml.custoUnitario,
        ncm: itemXml.ncm,
        cfop: itemXml.cfop,
        lote: itemXml.lote,
        validade: itemXml.validade,
      });
    }

    const pedido = await this.criarPedidoCompra({
      numero: extraida.numero,
      fornecedorId: fornecedorResultado.fornecedor.id,
      empresaId: empresaAtiva?.id,
      previsao: extraida.dataEntrada,
      valorFrete: extraida.valorFrete,
      valorImpostos: extraida.valorImpostos,
      observacoes: `Importacao XML NF-e ${extraida.numero}/${extraida.serie}`,
      itens: itensPedido,
    });

    const recebimento = await this.receberNotaFiscalCompra({
      pedidoCompraId: pedido.id,
      numero: extraida.numero,
      serie: extraida.serie,
      chaveAcesso: extraida.chaveAcesso,
      dataEmissao: extraida.dataEmissao,
      dataEntrada: extraida.dataEntrada,
      valorFrete: extraida.valorFrete,
      valorImpostos: extraida.valorImpostos,
      observacoes: `Importacao XML NF-e ${extraida.numero}/${extraida.serie}`,
      itens: itensPedido.map((item) => ({
        produtoId: item.produtoId,
        quantidadeRecebida: item.quantidade,
        custoUnitario: item.custoUnitario,
        depositoDestinoId: payload.depositoDestinoId,
      })),
      parcelas: extraida.parcelas,
    }, usuarioId);

    return {
      message: "XML importado com sucesso. NF-e vinculada ao estoque e financeiro.",
      notaFiscal: {
        numero: extraida.numero,
        serie: extraida.serie,
        chaveAcesso: extraida.chaveAcesso,
        dataEmissao: extraida.dataEmissao,
        fornecedor: fornecedorResultado.fornecedor.nome,
        valorTotal: extraida.valorTotal,
      },
      pedidoCompraId: pedido.id,
      resumo: {
        itensNota: extraida.itens.length,
        fornecedorCriado: fornecedorResultado.created,
        marcasCriadas,
        produtosCriados,
        produtosAtualizados,
      },
      recebimento,
    };
  }

  async previewImportacaoNotaFiscalCompraXml(data: unknown) {
    const payload = previewNfeCompraXmlSchema.parse(data);
    const extraida = this.extrairCompraDeXml(payload.xml);

    const fornecedorCnpj = extraida.fornecedorCnpj;
    const fornecedorNome = extraida.fornecedorNome;

    const fornecedor = fornecedorCnpj
      ? await prisma.fornecedor.findUnique({ where: { cnpj: fornecedorCnpj } })
      : (fornecedorNome ? await prisma.fornecedor.findFirst({ where: { nome: fornecedorNome } }) : null);

    const codigosBarras = Array.from(new Set(extraida.itens.map((item) => item.codigoBarras).filter(Boolean))) as string[];
    const codigosInternos = Array.from(new Set(extraida.itens.map((item) => item.codigoInterno).filter(Boolean))) as string[];
    const nomesProdutos = Array.from(new Set(extraida.itens.map((item) => item.nome)));
    const marcasXml = Array.from(new Set(extraida.itens.map((item) => this.normalizarTexto(item.marcaNome)).filter(Boolean))) as string[];

    const produtos = await prisma.produto.findMany({
      where: {
        OR: [
          ...(codigosBarras.length > 0 ? [{ codigoBarras: { in: codigosBarras } }] : []),
          ...(codigosInternos.length > 0 ? [{ codigo: { in: codigosInternos } }] : []),
          ...(nomesProdutos.length > 0 ? [{ nome: { in: nomesProdutos } }] : []),
        ],
      },
      select: {
        id: true,
        nome: true,
        codigo: true,
        codigoBarras: true,
      },
    });

    const marcas = marcasXml.length > 0
      ? await prisma.marca.findMany({ where: { nome: { in: marcasXml } }, select: { id: true, nome: true } })
      : [];

    const produtoPorCodigoBarras = new Map(produtos.filter((p: any) => p.codigoBarras).map((p: any) => [String(p.codigoBarras), p]));
    const produtoPorCodigoInterno = new Map(produtos.filter((p: any) => p.codigo).map((p: any) => [String(p.codigo), p]));
    const produtoPorNome = new Map(produtos.map((p: any) => [String(p.nome), p]));

    const itens = extraida.itens.map((item) => {
      const produtoEncontrado = (item.codigoBarras ? produtoPorCodigoBarras.get(item.codigoBarras) : undefined)
        || (item.codigoInterno ? produtoPorCodigoInterno.get(item.codigoInterno) : undefined)
        || produtoPorNome.get(item.nome);

      const marcaEncontrada = marcas.find((marca: any) => marca.nome === this.normalizarTexto(item.marcaNome));

      return {
        nome: item.nome,
        codigoInterno: item.codigoInterno || null,
        codigoBarras: item.codigoBarras || null,
        quantidade: item.quantidade,
        custoUnitario: item.custoUnitario,
        valorTotal: item.valorTotal,
        unidade: item.unidade || null,
        ncm: item.ncm || null,
        cfop: item.cfop || null,
        marcaNome: item.marcaNome || null,
        validade: item.validade ? item.validade.toISOString().slice(0, 10) : null,
        produtoEncontradoId: produtoEncontrado?.id || null,
        produtoEncontradoNome: produtoEncontrado?.nome || null,
        marcaEncontradaId: marcaEncontrada?.id || null,
      };
    });

    const itensComProduto = itens.filter((item) => item.produtoEncontradoId).length;

    return {
      notaFiscal: {
        numero: extraida.numero,
        serie: extraida.serie,
        chaveAcesso: extraida.chaveAcesso,
        dataEmissao: extraida.dataEmissao,
        fornecedorNome: extraida.fornecedorNome || null,
        fornecedorCnpj: extraida.fornecedorCnpj || null,
        valorTotal: extraida.valorTotal,
        valorFrete: extraida.valorFrete,
        valorImpostos: extraida.valorImpostos,
      },
      fornecedorEncontrado: fornecedor
        ? { id: fornecedor.id, nome: fornecedor.nome, cnpj: fornecedor.cnpj || null }
        : null,
      resumo: {
        itensNota: itens.length,
        itensComProdutoEncontrado: itensComProduto,
        itensSemProdutoEncontrado: itens.length - itensComProduto,
        marcasEncontradas: marcas.length,
      },
      itens,
    };
  }

  async listarNotasFiscaisCompra(filtros: { inicio?: string; fim?: string; fornecedorId?: string; statusPedido?: string } = {}) {
    const pedidos = await prisma.pedidoCompra.findMany({
      where: {
        ...(filtros.fornecedorId ? { fornecedorId: filtros.fornecedorId } : {}),
        ...(filtros.statusPedido ? { status: filtros.statusPedido as any } : {}),
      },
      include: {
        fornecedor: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const documentos = pedidos.flatMap((pedido: any) => {
      const metadata = (pedido.metadata && typeof pedido.metadata === "object" && !Array.isArray(pedido.metadata))
        ? pedido.metadata
        : {};
      const notas = Array.isArray((metadata as any).notasEntrada) ? (metadata as any).notasEntrada : [];

      return notas.map((nota: any) => ({
        pedidoCompraId: pedido.id,
        numeroPedido: pedido.numero,
        fornecedorId: pedido.fornecedorId,
        fornecedor: pedido.fornecedor?.nome || null,
        numero: String(nota.numero || ""),
        serie: String(nota.serie || ""),
        chaveAcesso: nota.chaveAcesso || null,
        dataEmissao: nota.dataEmissao || null,
        dataEntrada: nota.dataEntrada || null,
        valorTotal: Number(nota.valorTotal || 0),
        valorFrete: Number(nota.valorFrete || 0),
        valorImpostos: Number(nota.valorImpostos || 0),
        statusPedido: pedido.status,
        origemReferenciaFinanceira: `NFE_ENTRADA:${pedido.id}:${nota.numero}`,
        notaFiscal: nota,
      }));
    });

    const filtrados = documentos.filter((documento) => {
      if (filtros.inicio && documento.dataEntrada && new Date(documento.dataEntrada) < new Date(filtros.inicio)) return false;
      if (filtros.fim && documento.dataEntrada && new Date(documento.dataEntrada) > new Date(filtros.fim)) return false;
      return true;
    });

    const origens = Array.from(new Set(filtrados.map((item) => item.origemReferenciaFinanceira)));
    const lancamentos = origens.length > 0
      ? await (prisma as any).lancamentoFinanceiro.findMany({
          where: {
            origemReferencia: { in: origens },
          },
          orderBy: [{ vencimento: "asc" }, { createdAt: "asc" }],
        })
      : [];

    const lancamentosPorOrigem = lancamentos.reduce<Record<string, any[]>>((acc, lancamento) => {
      const chave = String(lancamento.origemReferencia || "");
      if (!acc[chave]) acc[chave] = [];
      acc[chave].push(lancamento);
      return acc;
    }, {});

    return filtrados.map((documento) => ({
      ...documento,
      lancamentosFinanceiros: lancamentosPorOrigem[documento.origemReferenciaFinanceira] || [],
    }));
  }

  async abrirInventario(data: unknown, usuarioId?: string) {
    const inventario = inventarioSchema.parse(data);

    return prisma.inventarioEstoque.create({
      data: {
        tipo: inventario.tipo,
        descricao: inventario.descricao,
        empresaId: inventario.empresaId,
        depositoId: inventario.depositoId,
        dispositivo: inventario.dispositivo,
        usuarioId,
        itens: {
          create: inventario.itens.map((item) => ({
            ...item,
            divergencia: item.quantidadeContada - item.quantidadeSistema,
          })),
        },
      },
      include: { itens: { include: { produto: true } }, deposito: true },
    });
  }

  private async aplicarSaldo(tx: any, movimentacao: z.infer<typeof movimentacaoSchema>) {
    const quantidade = movimentacao.quantidade;

    if (movimentacao.depositoOrigemId) {
      await this.garantirSaldo(tx, movimentacao.produtoId, movimentacao.depositoOrigemId);
    }

    if (movimentacao.depositoDestinoId) {
      await this.garantirSaldo(tx, movimentacao.produtoId, movimentacao.depositoDestinoId);
    }

    const entrada = ["ENTRADA_COMPRA", "ENTRADA_DEVOLUCAO", "ENTRADA_PRODUCAO"];
    const saida = ["SAIDA_VENDA", "SAIDA_PERDA", "SAIDA_CONSUMO_INTERNO", "SAIDA_AVARIA", "SAIDA_DEVOLUCAO_FORNECEDOR"];

    if (entrada.includes(movimentacao.tipo)) {
      await this.alterarFisico(tx, movimentacao.produtoId, movimentacao.depositoDestinoId, quantidade);
      return;
    }

    if (saida.includes(movimentacao.tipo)) {
      await this.alterarFisico(tx, movimentacao.produtoId, movimentacao.depositoOrigemId, -quantidade);
      return;
    }

    if (movimentacao.tipo === "RESERVA") {
      await this.alterarReserva(tx, movimentacao.produtoId, movimentacao.depositoOrigemId, quantidade);
      return;
    }

    if (movimentacao.tipo === "LIBERACAO_RESERVA") {
      await this.alterarReserva(tx, movimentacao.produtoId, movimentacao.depositoOrigemId, -quantidade);
      return;
    }

    if (movimentacao.tipo === "TRANSFERENCIA") {
      if (!movimentacao.depositoOrigemId || !movimentacao.depositoDestinoId) {
        throw new Error("Transferencia exige deposito de origem e destino");
      }
      await this.alterarFisico(tx, movimentacao.produtoId, movimentacao.depositoOrigemId, -quantidade);
      await this.alterarFisico(tx, movimentacao.produtoId, movimentacao.depositoDestinoId, quantidade);
    }
  }

  private async garantirSaldo(tx: any, produtoId: string, depositoId: string) {
    await tx.produtoEstoque.upsert({
      where: { produtoId_depositoId: { produtoId, depositoId } },
      update: {},
      create: { produtoId, depositoId },
    });
  }

  private async alterarFisico(tx: any, produtoId: string, depositoId: string | undefined, delta: number) {
    if (depositoId) {
      const saldo = await tx.produtoEstoque.update({
        where: { produtoId_depositoId: { produtoId, depositoId } },
        data: { estoqueFisico: { increment: delta } },
      });

      await tx.produtoEstoque.update({
        where: { id: saldo.id },
        data: { estoqueDisponivel: Number(saldo.estoqueFisico || 0) - Number(saldo.estoqueReservado || 0) },
      });
    }

    const produto = await tx.produto.update({
      where: { id: produtoId },
      data: { estoque: { increment: delta } },
    });

    await tx.produto.update({
      where: { id: produtoId },
      data: { estoqueDisponivel: Number(produto.estoque || 0) - Number(produto.estoqueReservado || 0) },
    });
  }

  private async alterarReserva(tx: any, produtoId: string, depositoId: string | undefined, delta: number) {
    if (depositoId) {
      const saldo = await tx.produtoEstoque.update({
        where: { produtoId_depositoId: { produtoId, depositoId } },
        data: { estoqueReservado: { increment: delta } },
      });

      await tx.produtoEstoque.update({
        where: { id: saldo.id },
        data: { estoqueDisponivel: Number(saldo.estoqueFisico || 0) - Number(saldo.estoqueReservado || 0) },
      });
    }

    const produto = await tx.produto.update({
      where: { id: produtoId },
      data: { estoqueReservado: { increment: delta } },
    });

    await tx.produto.update({
      where: { id: produtoId },
      data: { estoqueDisponivel: Number(produto.estoque || 0) - Number(produto.estoqueReservado || 0) },
    });
  }

  private async auditar(tx: any, entidade: string, entidadeId: string, acao: string, usuarioId: string | undefined, antes: unknown, depois: unknown) {
    await tx.estoqueAuditoria.create({
      data: { entidade, entidadeId, acao, usuarioId, antes: antes || undefined, depois: depois || undefined },
    });
  }

  private toCatalogoItem(produto: any, janelaDias = 60) {
    const validadeMaisProxima = produto.validade ? new Date(produto.validade) : null;
    const statusValidade = this.getStatusValidade(validadeMaisProxima, janelaDias);

    return {
      id: produto.id,
      tipo: mapTipoProdutoParaCatalogo(String(produto.tipo || "FISICO")),
      nome: produto.nome,
      codigoInterno: produto.codigo || produto.sku || null,
      codigoBarras: produto.codigoBarras || null,
      unidadeVenda: produto.unidadeMedida,
      grupoId: produto.grupoProdutoId || null,
      grupo: produto.grupoProduto?.nome || null,
      marcaId: produto.marcaId,
      marca: produto.marca?.nome || null,
      custoAtual: Number(produto.custoMedio || 0),
      precoVenda: Number(produto.preco || 0),
      markupAtual: Number(produto.markup || 0),
      estoqueAtual: Number(produto.estoqueDisponivel || produto.estoque || 0),
      estoqueMinimo: Number(produto.estoqueMinimo || 0),
      validadeMaisProxima: validadeMaisProxima ? validadeMaisProxima.toISOString().slice(0, 10) : null,
      statusValidade,
      ativo: Boolean(produto.ativo),
    };
  }

  private getStatusValidade(validade: Date | null, janelaDias: number) {
    if (!validade) return "OK";

    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const dataValidade = new Date(validade.getFullYear(), validade.getMonth(), validade.getDate());
    const janela = new Date(inicioHoje);
    janela.setDate(janela.getDate() + janelaDias);

    if (dataValidade < inicioHoje) return "VENCIDO";
    if (dataValidade <= janela) return "VENCENDO";
    return "OK";
  }

  private extrairCompraDeXml(xml: string): XmlCompraExtraida {
    const parser = new XMLParser({
      ignoreAttributes: false,
      trimValues: true,
      parseTagValue: false,
    });

    const parsed = parser.parse(xml);
    const nfeProc = parsed?.nfeProc || parsed;
    const nfe = nfeProc?.NFe || parsed?.NFe || nfeProc;
    const infNFe = nfe?.infNFe;
    const protNFe = nfeProc?.protNFe;

    if (!infNFe) {
      throw new Error("XML de NF-e invalido: bloco infNFe nao encontrado");
    }

    const ide = infNFe.ide || {};
    const emit = infNFe.emit || {};
    const total = infNFe.total?.ICMSTot || {};
    const cobr = infNFe.cobr || {};

    const numero = String(ide.nNF || "").trim();
    const serie = String(ide.serie || "1").trim() || "1";
    const chaveAcessoRaw = String(protNFe?.infProt?.chNFe || infNFe?.["@_Id"] || infNFe?.Id || "").trim();
    const chaveAcesso = chaveAcessoRaw.replace(/^NFe/i, "");

    if (!numero) {
      throw new Error("XML invalido: numero da NF-e (nNF) nao encontrado");
    }

    if (chaveAcesso.length < 32) {
      throw new Error("XML invalido: chave de acesso da NF-e nao encontrada");
    }

    const dets = this.toArray<any>(infNFe.det);
    const itens = dets.map((det: any) => {
      const prod = det?.prod || {};
      const rastro = this.toArray<any>(det?.rastro || prod?.rastro)[0] || {};

      const nome = this.normalizarTexto(prod.xProd);
      const quantidade = this.toNumber(prod.qCom ?? prod.qTrib);
      const custoUnitario = this.toNumber(prod.vUnCom ?? prod.vUnTrib);
      const valorTotal = this.toNumber(prod.vProd);

      if (!nome) {
        throw new Error("XML invalido: item sem nome (xProd)");
      }

      if (quantidade <= 0) {
        throw new Error(`Quantidade invalida no item ${nome}`);
      }

      return {
        nome,
        codigoInterno: this.normalizarCodigo(prod.cProd),
        codigoBarras: this.normalizarCodigoBarras(prod.cEAN || prod.cEANTrib),
        quantidade,
        custoUnitario: custoUnitario > 0 ? custoUnitario : Number((valorTotal / quantidade).toFixed(4)),
        valorTotal,
        unidade: this.normalizarTexto(prod.uCom),
        ncm: this.normalizarTexto(prod.NCM),
        cfop: this.normalizarTexto(prod.CFOP),
        marcaNome: this.normalizarTexto(prod.xMarca),
        lote: this.normalizarTexto(rastro.nLote),
        validade: this.toDate(rastro.dVal),
      } as XmlCompraItem;
    });

    const parcelas = this.toArray<any>(cobr.dup)
      .map((dup: any, index: number) => {
        const valor = this.toNumber(dup?.vDup);
        const vencimento = this.toDate(dup?.dVenc);
        if (valor <= 0 || !vencimento) return null;
        return {
          numeroParcela: Number(dup?.nDup || index + 1),
          valor,
          vencimento,
        };
      })
      .filter(Boolean) as Array<{ numeroParcela: number; valor: number; vencimento: Date }>;

    return {
      numero,
      serie,
      chaveAcesso,
      dataEmissao: this.toDate(ide?.dhEmi || ide?.dEmi) || new Date(),
      dataEntrada: new Date(),
      valorFrete: this.toNumber(total?.vFrete),
      valorImpostos: this.toNumber(total?.vIPI) + this.toNumber(total?.vII) + this.toNumber(total?.vST),
      valorTotal: this.toNumber(total?.vNF),
      fornecedorNome: this.normalizarTexto(emit?.xNome),
      fornecedorCnpj: this.onlyDigits(emit?.CNPJ),
      itens,
      parcelas,
    };
  }

  private async obterOuCriarFornecedorXml(extraida: XmlCompraExtraida, fallbackNome?: string) {
    const nome = extraida.fornecedorNome || this.normalizarTexto(fallbackNome) || "Fornecedor XML";
    const cnpj = extraida.fornecedorCnpj;

    if (cnpj) {
      const existentePorCnpj = await prisma.fornecedor.findUnique({ where: { cnpj } });
      if (existentePorCnpj) {
        return { fornecedor: existentePorCnpj, created: false };
      }
    }

    const existentePorNome = await prisma.fornecedor.findFirst({ where: { nome } });
    if (existentePorNome) {
      return { fornecedor: existentePorNome, created: false };
    }

    const criado = await prisma.fornecedor.create({
      data: {
        nome,
        cnpj: cnpj || undefined,
      },
    });

    return { fornecedor: criado, created: true };
  }

  private async obterOuCriarMarcaXml(nomeMarca: string, fornecedorId: string, cache: Map<string, { id: string; created: boolean }>) {
    const chave = nomeMarca.toLowerCase();
    const doCache = cache.get(chave);
    if (doCache) {
      return {
        marca: { id: doCache.id },
        created: doCache.created,
      };
    }

    const existente = await prisma.marca.findFirst({ where: { nome: nomeMarca } });
    if (existente) {
      cache.set(chave, { id: existente.id, created: false });
      return { marca: existente, created: false };
    }

    const criada = await prisma.marca.create({
      data: {
        nome: nomeMarca,
        fornecedorId,
      },
    });

    cache.set(chave, { id: criada.id, created: true });
    return { marca: criada, created: true };
  }

  private async obterOuCriarProdutoViaXml(
    item: XmlCompraItem,
    options: { usuarioId: string; marcaId: string; criarProdutosNovos: boolean; atualizarCustoProduto: boolean },
  ) {
    const { usuarioId, marcaId, criarProdutosNovos, atualizarCustoProduto } = options;

    let produto = null as any;

    if (item.codigoBarras) {
      produto = await prisma.produto.findFirst({ where: { codigoBarras: item.codigoBarras } });
    }

    if (!produto && item.codigoInterno) {
      produto = await prisma.produto.findFirst({ where: { codigo: item.codigoInterno } });
    }

    if (!produto) {
      produto = await prisma.produto.findFirst({ where: { nome: item.nome } });
    }

    if (produto) {
      let updated = false;
      if (atualizarCustoProduto) {
        produto = await prisma.produto.update({
          where: { id: produto.id },
          data: {
            custoMedio: item.custoUnitario,
            ...(item.validade ? { validade: item.validade } : {}),
            ...(item.ncm ? { ncm: item.ncm } : {}),
            ...(item.cfop ? { cfop: item.cfop } : {}),
            ...(item.codigoInterno && !produto.codigo ? { codigo: item.codigoInterno } : {}),
            ...(item.codigoBarras && !produto.codigoBarras ? { codigoBarras: item.codigoBarras } : {}),
          },
        });
        updated = true;
      }

      return {
        produto,
        created: false,
        updated,
      };
    }

    if (!criarProdutosNovos) {
      throw new Error(`Produto nao encontrado no catalogo: ${item.nome}`);
    }

    const criado = await prisma.produto.create({
      data: {
        nome: item.nome,
        peso: 0,
        porte: "NAO_APLICA",
        preco: item.custoUnitario,
        estoque: 0,
        tipo: "FISICO",
        codigo: item.codigoInterno,
        codigoBarras: item.codigoBarras,
        unidadeMedida: item.unidade || "UN",
        custoMedio: item.custoUnitario,
        estoqueDisponivel: 0,
        ncm: item.ncm,
        cfop: item.cfop,
        validade: item.validade,
        usuarioId,
        marcaId,
      },
    });

    return {
      produto: criado,
      created: true,
      updated: false,
    };
  }

  private toArray<T>(value: T | T[] | undefined): T[] {
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
  }

  private toNumber(value: unknown): number {
    if (value === undefined || value === null || value === "") return 0;
    const normalized = String(value).replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toDate(value: unknown): Date | undefined {
    if (!value) return undefined;
    const raw = String(value).trim();
    if (!raw) return undefined;

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [dia, mes, ano] = raw.split("/");
      const parsed = new Date(`${ano}-${mes}-${dia}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    return undefined;
  }

  private normalizarTexto(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    const normalized = String(value).trim();
    return normalized || undefined;
  }

  private normalizarCodigo(value: unknown): string | undefined {
    const normalized = this.normalizarTexto(value);
    if (!normalized) return undefined;
    return normalized.slice(0, 100);
  }

  private normalizarCodigoBarras(value: unknown): string | undefined {
    const normalized = this.normalizarTexto(value);
    if (!normalized) return undefined;

    const upper = normalized.toUpperCase();
    if (upper === "SEM GTIN" || upper === "SEMGTIN" || upper === "0") {
      return undefined;
    }

    return normalized.slice(0, 60);
  }

  private onlyDigits(value: unknown): string | undefined {
    const raw = this.normalizarTexto(value);
    if (!raw) return undefined;
    const digits = raw.replace(/\D/g, "");
    return digits || undefined;
  }
}

export default new EstoqueService();
