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

export class EstoqueService {
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

  async listarSaldos(filtros: { produtoId?: string; depositoId?: string }) {
    return prisma.produtoEstoque.findMany({
      where: {
        ...(filtros.produtoId ? { produtoId: filtros.produtoId } : {}),
        ...(filtros.depositoId ? { depositoId: filtros.depositoId } : {}),
      },
      include: { produto: true, deposito: true },
      orderBy: { updatedAt: "desc" },
    });
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

  async listarPedidosCompra(status?: string) {
    return prisma.pedidoCompra.findMany({
      where: status ? { status } : {},
      include: { fornecedor: true, itens: { include: { produto: true } } },
      orderBy: { createdAt: "desc" },
    });
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
}

export default new EstoqueService();
