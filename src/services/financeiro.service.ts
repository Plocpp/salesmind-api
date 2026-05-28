import { z } from "zod";
import prismaClient from "../database/prisma";

const prisma = prismaClient as any;

const tipoLancamentoSchema = z.enum([
  "RECEITA",
  "DESPESA",
  "TRANSFERENCIA",
  "AJUSTE",
  "ESTORNO",
  "TAXA",
  "COMISSAO",
  "IMPOSTO",
  "JUROS",
  "MULTA",
]);

const origemLancamentoSchema = z.enum([
  "MERCADO_LIVRE",
  "SHOPEE",
  "AMAZON",
  "MAGAZINE_LUIZA",
  "BLING",
  "PDV",
  "ERP",
  "MANUAL",
  "API",
  "VENDA",
  "GATEWAY",
  "BANCO",
]);

const statusLancamentoSchema = z.enum([
  "PENDENTE",
  "PAGO",
  "PARCIAL",
  "CANCELADO",
  "VENCIDO",
  "ESTORNADO",
  "CONCILIADO",
]);

const lancamentoSchema = z.object({
  descricao: z.string().min(1),
  tipo: tipoLancamentoSchema,
  status: statusLancamentoSchema.optional(),
  valorBruto: z.number().positive(),
  valorLiquido: z.number().positive(),
  competencia: z.coerce.date(),
  vencimento: z.coerce.date(),
  pagamento: z.coerce.date().optional(),
  origem: origemLancamentoSchema.default("MANUAL"),
  origemReferencia: z.string().optional(),
  centroCusto: z.string().optional(),
  observacoes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  empresaId: z.string().optional(),
  categoriaId: z.string().optional(),
  contaFinanceiraId: z.string().optional(),
  formaPagamentoId: z.string().optional(),
  vendaId: z.string().optional(),
  clienteId: z.string().optional(),
  fornecedorId: z.string().optional(),
  parentId: z.string().optional(),
  recorrenciaId: z.string().optional(),
});

const contaSchema = z.object({
  nome: z.string().min(1),
  tipo: z.enum(["BANCO", "CAIXA", "CARTEIRA", "CARTAO", "GATEWAY"]),
  banco: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  saldo: z.number().default(0),
  saldoBloqueado: z.number().default(0),
  saldoDisponivel: z.number().default(0),
  empresaId: z.string().optional(),
});

const categoriaSchema = z.object({
  nome: z.string().min(1),
  tipo: tipoLancamentoSchema.optional(),
  cor: z.string().optional(),
  icone: z.string().optional(),
  parentId: z.string().optional(),
  empresaId: z.string().optional(),
});

const formaPagamentoSchema = z.object({
  nome: z.string().min(1),
  tipo: z.enum([
    "DINHEIRO",
    "PIX",
    "BOLETO",
    "CREDITO",
    "DEBITO",
    "CARTEIRA_DIGITAL",
    "GATEWAY",
    "CREDIARIO",
    "VOUCHER",
  ]),
  taxaPercentual: z.number().default(0),
  taxaFixa: z.number().default(0),
  prazoRecebimentoDias: z.number().int().default(0),
  permiteParcelamento: z.boolean().default(false),
  permiteAntecipacao: z.boolean().default(false),
  empresaId: z.string().optional(),
});

const conciliacaoSchema = z.object({
  adquirente: z.string().optional(),
  bandeira: z.string().optional(),
  nsu: z.string().optional(),
  authorizationCode: z.string().optional(),
  parcelas: z.number().int().positive().default(1),
  valorVenda: z.number().positive(),
  valorRecebido: z.number().positive(),
  taxaAplicada: z.number().default(0),
  dataVenda: z.coerce.date().optional(),
  dataRecebimento: z.coerce.date().optional(),
  origemImportacao: z.enum(["API", "CNAB", "OFX", "CSV", "WEBHOOK"]).default("API"),
  empresaId: z.string().optional(),
  lancamentoId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const atualizarLancamentoSchema = z.object({
  descricao: z.string().min(1).optional(),
  status: statusLancamentoSchema.optional(),
  valorBruto: z.number().positive().optional(),
  valorLiquido: z.number().positive().optional(),
  vencimento: z.coerce.date().optional(),
  pagamento: z.coerce.date().nullable().optional(),
  observacoes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const envioManualSchema = z.object({
  canal: z.enum(["EMAIL", "WHATSAPP", "SMS", "LINK", "MANUAL"]).default("MANUAL"),
  destinatario: z.string().min(1),
  mensagem: z.string().optional(),
  assunto: z.string().optional(),
  boleto: z.object({
    linhaDigitavel: z.string().optional(),
    codigoBarras: z.string().optional(),
    nossoNumero: z.string().optional(),
    banco: z.string().optional(),
    urlPdf: z.string().url().optional(),
  }).optional(),
});

const atualizarLancamentosDocumentoSchema = z.object({
  origemReferencia: z.string().min(1),
  parcelas: z.array(z.object({
    lancamentoId: z.string().optional(),
    valorLiquido: z.number().positive(),
    vencimento: z.coerce.date(),
    observacoes: z.string().optional(),
    boleto: z.object({
      linhaDigitavel: z.string().optional(),
      codigoBarras: z.string().optional(),
      nossoNumero: z.string().optional(),
      banco: z.string().optional(),
      urlPdf: z.string().url().optional(),
    }).optional(),
  })).min(1),
});

const envioManualLoteSchema = z.object({
  origemReferencia: z.string().min(1),
  canal: z.enum(["EMAIL", "WHATSAPP", "SMS", "LINK", "MANUAL"]).default("MANUAL"),
  destinatario: z.string().min(1),
  mensagem: z.string().optional(),
  assunto: z.string().optional(),
});

export class FinanceiroService {
  async criarLancamento(data: unknown, usuarioId?: string) {
    const lancamento = lancamentoSchema.parse(data);

    return prisma.$transaction(async (tx: any) => {
      const criado = await tx.lancamentoFinanceiro.create({
        data: {
          ...lancamento,
          usuarioId,
          valorPago: lancamento.status === "PAGO" ? lancamento.valorLiquido : 0,
        },
      });

      await this.auditar(tx, "LancamentoFinanceiro", criado.id, "CRIACAO", usuarioId, null, criado, criado.id);
      return criado;
    });
  }

  async listarLancamentos(filtros: {
    usuarioId?: string;
    status?: string;
    tipo?: string;
    origem?: string;
    empresaId?: string;
    inicio?: string;
    fim?: string;
  }) {
    const where: Record<string, unknown> = {};

    if (filtros.status) where.status = filtros.status;
    if (filtros.tipo) where.tipo = filtros.tipo;
    if (filtros.origem) where.origem = filtros.origem;
    if (filtros.empresaId) where.empresaId = filtros.empresaId;
    if (filtros.inicio || filtros.fim) {
      where.vencimento = {
        ...(filtros.inicio ? { gte: new Date(filtros.inicio) } : {}),
        ...(filtros.fim ? { lte: new Date(filtros.fim) } : {}),
      };
    }

    return prisma.lancamentoFinanceiro.findMany({
      where,
      include: {
        categoria: true,
        contaFinanceira: true,
        formaPagamento: true,
        cliente: true,
        fornecedor: true,
        venda: true,
      },
      orderBy: [{ vencimento: "asc" }, { createdAt: "desc" }],
    });
  }

  async baixarLancamento(id: string, valorPago: number, usuarioId?: string, dataPagamento = new Date()) {
    if (valorPago <= 0) {
      throw new Error("Valor de baixa deve ser maior que zero");
    }

    return prisma.$transaction(async (tx: any) => {
      const atual = await tx.lancamentoFinanceiro.findUnique({ where: { id } });
      if (!atual) {
        throw new Error("Lancamento financeiro nao encontrado");
      }

      const novoValorPago = Number(atual.valorPago || 0) + valorPago;
      const status = novoValorPago >= Number(atual.valorLiquido) ? "PAGO" : "PARCIAL";

      const atualizado = await tx.lancamentoFinanceiro.update({
        where: { id },
        data: {
          valorPago: novoValorPago,
          status,
          pagamento: dataPagamento,
        },
      });

      await this.auditar(tx, "LancamentoFinanceiro", id, "BAIXA", usuarioId, atual, atualizado, id);
      return atualizado;
    });
  }

  async atualizarLancamento(id: string, data: unknown, usuarioId?: string) {
    const payload = atualizarLancamentoSchema.parse(data);

    return prisma.$transaction(async (tx: any) => {
      const atual = await tx.lancamentoFinanceiro.findUnique({ where: { id } });
      if (!atual) {
        throw new Error("Lancamento financeiro nao encontrado");
      }

      const valorBruto = payload.valorBruto ?? Number(atual.valorBruto || 0);
      const valorLiquido = payload.valorLiquido ?? Number(atual.valorLiquido || 0);

      const atualizado = await tx.lancamentoFinanceiro.update({
        where: { id },
        data: {
          ...(payload.descricao ? { descricao: payload.descricao } : {}),
          ...(payload.status ? { status: payload.status } : {}),
          ...(payload.vencimento ? { vencimento: payload.vencimento } : {}),
          ...(payload.pagamento !== undefined ? { pagamento: payload.pagamento || null } : {}),
          ...(payload.observacoes !== undefined ? { observacoes: payload.observacoes } : {}),
          valorBruto,
          valorLiquido,
          metadata: {
            ...((atual.metadata && typeof atual.metadata === "object" && !Array.isArray(atual.metadata)) ? atual.metadata : {}),
            ...(payload.metadata || {}),
            alteradoManualEm: new Date().toISOString(),
          },
        },
      });

      await this.auditar(tx, "LancamentoFinanceiro", id, "EDICAO", usuarioId, atual, atualizado, id);
      return atualizado;
    });
  }

  async enviarCobrancaManual(id: string, data: unknown, usuarioId?: string) {
    const payload = envioManualSchema.parse(data);

    return prisma.$transaction(async (tx: any) => {
      const atual = await tx.lancamentoFinanceiro.findUnique({ where: { id } });
      if (!atual) {
        throw new Error("Lancamento financeiro nao encontrado");
      }

      const metadataAtual = (atual.metadata && typeof atual.metadata === "object" && !Array.isArray(atual.metadata))
        ? atual.metadata
        : {};

      const historico = Array.isArray((metadataAtual as any).enviosManuais)
        ? (metadataAtual as any).enviosManuais
        : [];

      const registroEnvio = {
        canal: payload.canal,
        destinatario: payload.destinatario,
        assunto: payload.assunto || null,
        mensagem: payload.mensagem || null,
        boleto: payload.boleto || null,
        enviadoEm: new Date().toISOString(),
        enviadoPor: usuarioId || null,
      };

      const atualizado = await tx.lancamentoFinanceiro.update({
        where: { id },
        data: {
          metadata: {
            ...(metadataAtual as any),
            enviosManuais: [...historico, registroEnvio],
          },
        },
      });

      await this.auditar(tx, "LancamentoFinanceiro", id, "ENVIO_MANUAL", usuarioId, atual, atualizado, id);

      return {
        message: "Cobranca/documento enviado manualmente com sucesso.",
        lancamentoId: id,
        envio: registroEnvio,
      };
    });
  }

  async atualizarLancamentosPorDocumento(data: unknown, usuarioId?: string) {
    const payload = atualizarLancamentosDocumentoSchema.parse(data);

    return prisma.$transaction(async (tx: any) => {
      const lancamentos = await tx.lancamentoFinanceiro.findMany({
        where: {
          origemReferencia: payload.origemReferencia,
          status: { not: "CANCELADO" },
        },
        orderBy: { vencimento: "asc" },
      });

      if (lancamentos.length === 0) {
        throw new Error("Nenhum lancamento encontrado para a origemReferencia informada");
      }

      const lancamentosPorId = new Map(lancamentos.map((item: any) => [item.id, item]));
      const atualizados: any[] = [];

      for (let index = 0; index < payload.parcelas.length; index += 1) {
        const parcela = payload.parcelas[index];
        const lancamento = parcela.lancamentoId
          ? lancamentosPorId.get(parcela.lancamentoId)
          : lancamentos[index];

        if (!lancamento) {
          throw new Error(`Lancamento nao encontrado para parcela ${index + 1}`);
        }

        const metadataAtual = (lancamento.metadata && typeof lancamento.metadata === "object" && !Array.isArray(lancamento.metadata))
          ? lancamento.metadata
          : {};

        const atualizado = await tx.lancamentoFinanceiro.update({
          where: { id: lancamento.id },
          data: {
            valorBruto: parcela.valorLiquido,
            valorLiquido: parcela.valorLiquido,
            vencimento: parcela.vencimento,
            ...(parcela.observacoes ? { observacoes: parcela.observacoes } : {}),
            metadata: {
              ...(metadataAtual as any),
              boleto: parcela.boleto || (metadataAtual as any).boleto || null,
              atualizadoPorDocumentoFiscalEm: new Date().toISOString(),
            },
          },
        });

        await this.auditar(tx, "LancamentoFinanceiro", lancamento.id, "EDICAO", usuarioId, lancamento, atualizado, lancamento.id);
        atualizados.push(atualizado);
      }

      return {
        message: "Parcelas e vencimentos atualizados com sucesso para o documento fiscal.",
        origemReferencia: payload.origemReferencia,
        totalAtualizados: atualizados.length,
        lancamentos: atualizados,
      };
    });
  }

  async enviarCobrancaManualPorDocumento(data: unknown, usuarioId?: string) {
    const payload = envioManualLoteSchema.parse(data);

    return prisma.$transaction(async (tx: any) => {
      const lancamentos = await tx.lancamentoFinanceiro.findMany({
        where: {
          origemReferencia: payload.origemReferencia,
          status: { in: ["PENDENTE", "PARCIAL", "VENCIDO"] },
        },
      });

      if (lancamentos.length === 0) {
        throw new Error("Nenhum lancamento pendente encontrado para o documento fiscal informado");
      }

      const enviados: any[] = [];
      for (const lancamento of lancamentos) {
        const metadataAtual = (lancamento.metadata && typeof lancamento.metadata === "object" && !Array.isArray(lancamento.metadata))
          ? lancamento.metadata
          : {};
        const historico = Array.isArray((metadataAtual as any).enviosManuais)
          ? (metadataAtual as any).enviosManuais
          : [];

        const envio = {
          canal: payload.canal,
          destinatario: payload.destinatario,
          assunto: payload.assunto || null,
          mensagem: payload.mensagem || null,
          enviadoEm: new Date().toISOString(),
          enviadoPor: usuarioId || null,
        };

        const atualizado = await tx.lancamentoFinanceiro.update({
          where: { id: lancamento.id },
          data: {
            metadata: {
              ...(metadataAtual as any),
              enviosManuais: [...historico, envio],
            },
          },
        });

        await this.auditar(tx, "LancamentoFinanceiro", lancamento.id, "ENVIO_MANUAL", usuarioId, lancamento, atualizado, lancamento.id);
        enviados.push({ lancamentoId: lancamento.id, envio });
      }

      return {
        message: "Cobrancas enviadas manualmente para todas as parcelas pendentes do documento fiscal.",
        origemReferencia: payload.origemReferencia,
        totalEnviados: enviados.length,
        envios: enviados,
      };
    });
  }

  async criarConta(data: unknown) {
    return prisma.contaFinanceira.create({ data: contaSchema.parse(data) });
  }

  async listarContas(empresaId?: string) {
    return prisma.contaFinanceira.findMany({
      where: empresaId ? { empresaId } : {},
      orderBy: { nome: "asc" },
    });
  }

  async criarCategoria(data: unknown) {
    return prisma.categoriaFinanceira.create({ data: categoriaSchema.parse(data) });
  }

  async listarCategorias(empresaId?: string) {
    return prisma.categoriaFinanceira.findMany({
      where: empresaId ? { empresaId } : {},
      include: { children: true, parent: true },
      orderBy: { nome: "asc" },
    });
  }

  async criarFormaPagamento(data: unknown) {
    return prisma.formaPagamentoFinanceira.create({ data: formaPagamentoSchema.parse(data) });
  }

  async listarFormasPagamento(empresaId?: string) {
    return prisma.formaPagamentoFinanceira.findMany({
      where: empresaId ? { empresaId } : {},
      orderBy: { nome: "asc" },
    });
  }

  async conciliarCartao(data: unknown, usuarioId?: string) {
    const conciliacao = conciliacaoSchema.parse(data);
    const valorDiferenca = Number((conciliacao.valorRecebido - conciliacao.valorVenda + conciliacao.taxaAplicada).toFixed(2));
    const status = Math.abs(valorDiferenca) < 1 ? "CONCILIADO" : "DIVERGENTE";
    const alerta = status === "DIVERGENTE" ? "taxa_divergente" : null;

    return prisma.$transaction(async (tx: any) => {
      const criada = await tx.conciliacaoCartao.create({
        data: {
          ...conciliacao,
          valorDiferenca,
          status,
          alerta,
        },
      });

      if (conciliacao.lancamentoId && status === "CONCILIADO") {
        const antes = await tx.lancamentoFinanceiro.findUnique({ where: { id: conciliacao.lancamentoId } });
        const depois = await tx.lancamentoFinanceiro.update({
          where: { id: conciliacao.lancamentoId },
          data: { status: "CONCILIADO", valorPago: conciliacao.valorRecebido },
        });
        await this.auditar(tx, "LancamentoFinanceiro", conciliacao.lancamentoId, "CONCILIACAO", usuarioId, antes, depois, conciliacao.lancamentoId);
      }

      return criada;
    });
  }

  async demonstrativo(filtros: { inicio?: string; fim?: string; empresaId?: string }) {
    const where = this.periodoWhere(filtros, "competencia");
    const lancamentos = await prisma.lancamentoFinanceiro.findMany({ where });

    const receitas = this.somar(lancamentos, ["RECEITA"]);
    const despesas = this.somar(lancamentos, ["DESPESA", "TAXA", "COMISSAO", "IMPOSTO", "JUROS", "MULTA"]);
    const lucroLiquido = receitas - despesas;

    return {
      receitas,
      despesas,
      lucroBruto: receitas,
      lucroLiquido,
      margem: receitas > 0 ? Number(((lucroLiquido / receitas) * 100).toFixed(2)) : 0,
      impostos: this.somar(lancamentos, ["IMPOSTO"]),
      taxas: this.somar(lancamentos, ["TAXA", "COMISSAO"]),
      totalLancamentos: lancamentos.length,
    };
  }

  async fluxoCaixa(filtros: { dias?: number; empresaId?: string }) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const fim = new Date(hoje);
    fim.setDate(fim.getDate() + (filtros.dias || 30));

    const lancamentos = await prisma.lancamentoFinanceiro.findMany({
      where: {
        ...(filtros.empresaId ? { empresaId: filtros.empresaId } : {}),
        vencimento: { gte: hoje, lte: fim },
        status: { in: ["PENDENTE", "PARCIAL", "VENCIDO"] },
      },
      orderBy: { vencimento: "asc" },
    });

    const entradasPrevistas = this.somar(lancamentos, ["RECEITA"]);
    const saidasPrevistas = this.somar(lancamentos, ["DESPESA", "TAXA", "COMISSAO", "IMPOSTO", "JUROS", "MULTA"]);

    return {
      periodoDias: filtros.dias || 30,
      entradasPrevistas,
      saidasPrevistas,
      saldoPrevisto: entradasPrevistas - saidasPrevistas,
      lancamentos,
    };
  }

  private periodoWhere(filtros: { inicio?: string; fim?: string; empresaId?: string }, campo: string) {
    return {
      ...(filtros.empresaId ? { empresaId: filtros.empresaId } : {}),
      ...((filtros.inicio || filtros.fim)
        ? {
            [campo]: {
              ...(filtros.inicio ? { gte: new Date(filtros.inicio) } : {}),
              ...(filtros.fim ? { lte: new Date(filtros.fim) } : {}),
            },
          }
        : {}),
    };
  }

  private somar(lancamentos: Array<{ tipo: string; valorLiquido: number }>, tipos: string[]) {
    return lancamentos
      .filter((lancamento) => tipos.includes(lancamento.tipo))
      .reduce((total, lancamento) => total + Number(lancamento.valorLiquido || 0), 0);
  }

  private async auditar(
    tx: any,
    entidade: string,
    entidadeId: string,
    acao: string,
    usuarioId: string | undefined,
    antes: unknown,
    depois: unknown,
    lancamentoId?: string,
  ) {
    await tx.financeiroAuditoria.create({
      data: {
        entidade,
        entidadeId,
        acao,
        usuarioId,
        antes: antes || undefined,
        depois: depois || undefined,
        lancamentoId,
      },
    });
  }
}

export default new FinanceiroService();
