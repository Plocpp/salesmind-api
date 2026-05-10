import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const integrationSchema = z.object({
  provider: z.string().min(1),
  status: z.string().optional(),
  ambiente: z.string().optional(),
  baseUrl: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  observacoes: z.string().optional(),
});

const companyConfigSchema = z.object({
  razaoSocial: z.string().optional(),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  inscricaoMunicipal: z.string().optional(),
  crt: z.string().optional(),
  regimeTributario: z.string().optional(),
  uf: z.string().optional(),
  municipio: z.string().optional(),
  ambiente: z.string().optional(),
  certificadoStatus: z.string().optional(),
  serieNfe: z.string().optional(),
  serieNfce: z.string().optional(),
});

const notaItemSchema = z.object({
  produtoId: z.string().optional().or(z.literal("")),
  codigo: z.string().optional(),
  descricao: z.string().min(1),
  ncm: z.string().optional(),
  cest: z.string().optional(),
  cfop: z.string().optional(),
  origem: z.string().optional(),
  cstIcms: z.string().optional(),
  csosn: z.string().optional(),
  quantidade: z.number().positive(),
  valorUnitario: z.number().nonnegative(),
  aliquotaIcms: z.number().nonnegative().optional(),
  aliquotaPis: z.number().nonnegative().optional(),
  aliquotaCofins: z.number().nonnegative().optional(),
  aliquotaIpi: z.number().nonnegative().optional(),
  movimentaEstoque: z.boolean().optional(),
});

const notaSchema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  modelo: z.enum(["NFE", "NFCE", "NFSE"]).optional(),
  finalidade: z.string().optional(),
  status: z.string().optional(),
  numero: z.string().optional(),
  serie: z.string().optional(),
  chaveAcesso: z.string().optional(),
  protocolo: z.string().optional(),
  emissorNome: z.string().optional(),
  emissorDocumento: z.string().optional(),
  destinatarioNome: z.string().optional(),
  destinatarioDocumento: z.string().optional(),
  dataEntradaSaida: z.string().optional().or(z.literal("")),
  integrationProvider: z.string().optional(),
  externalId: z.string().optional(),
  observacoes: z.string().optional(),
  itens: z.array(notaItemSchema).min(1),
});

function emptyToNull(value?: string | null) {
  return value?.trim() || null;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calcularItem(item: z.infer<typeof notaItemSchema>) {
  const valorProduto = roundMoney(item.quantidade * item.valorUnitario);
  const valorIcms = roundMoney(valorProduto * ((item.aliquotaIcms ?? 0) / 100));
  const valorPis = roundMoney(valorProduto * ((item.aliquotaPis ?? 0) / 100));
  const valorCofins = roundMoney(valorProduto * ((item.aliquotaCofins ?? 0) / 100));
  const valorIpi = roundMoney(valorProduto * ((item.aliquotaIpi ?? 0) / 100));
  const valorTributos = roundMoney(valorIcms + valorPis + valorCofins + valorIpi);

  return {
    ...item,
    produtoId: emptyToNull(item.produtoId),
    valorProduto,
    aliquotaIcms: item.aliquotaIcms ?? 0,
    valorIcms,
    aliquotaPis: item.aliquotaPis ?? 0,
    valorPis,
    aliquotaCofins: item.aliquotaCofins ?? 0,
    valorCofins,
    aliquotaIpi: item.aliquotaIpi ?? 0,
    valorIpi,
    valorTributos,
    valorTotal: roundMoney(valorProduto + valorTributos),
    movimentaEstoque: item.movimentaEstoque ?? true,
  };
}

export class FinanceiroService {
  async resumo() {
    const [notas, integracoes, produtosBaixoEstoque] = await Promise.all([
      prisma.notaFiscal.findMany({
        include: { itens: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.fiscalIntegration.findMany({ orderBy: { provider: "asc" } }),
      prisma.produto.findMany({
        where: { estoque: { lte: 5 } },
        orderBy: { estoque: "asc" },
        take: 10,
      }),
    ]);

    return {
      notas,
      integracoes,
      produtosBaixoEstoque,
      totais: {
        notas: notas.length,
        valorEntrada: roundMoney(notas.filter((n) => n.tipo === "ENTRADA").reduce((sum, n) => sum + n.valorTotal, 0)),
        valorSaida: roundMoney(notas.filter((n) => n.tipo === "SAIDA").reduce((sum, n) => sum + n.valorTotal, 0)),
        tributos: roundMoney(notas.reduce((sum, n) => sum + n.valorTributos, 0)),
      },
    };
  }

  async listarIntegracoes() {
    return prisma.fiscalIntegration.findMany({ orderBy: { provider: "asc" } });
  }

  async salvarIntegracao(data: z.infer<typeof integrationSchema>) {
    const parsed = integrationSchema.parse(data);
    return prisma.fiscalIntegration.create({ data: parsed });
  }

  async atualizarIntegracao(id: string, data: Partial<z.infer<typeof integrationSchema>>) {
    const parsed = integrationSchema.partial().parse(data);
    return prisma.fiscalIntegration.update({ where: { id }, data: parsed });
  }

  async obterConfiguracaoEmpresa() {
    const config = await prisma.fiscalCompanyConfig.findFirst({ orderBy: { createdAt: "asc" } });
    return config ?? prisma.fiscalCompanyConfig.create({ data: {} });
  }

  async salvarConfiguracaoEmpresa(data: z.infer<typeof companyConfigSchema>) {
    const parsed = companyConfigSchema.parse(data);
    const current = await this.obterConfiguracaoEmpresa();
    return prisma.fiscalCompanyConfig.update({
      where: { id: current.id },
      data: parsed,
    });
  }

  async listarNotas() {
    return prisma.notaFiscal.findMany({
      include: { itens: { include: { produto: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async registrarNota(data: z.infer<typeof notaSchema>) {
    const parsed = notaSchema.parse(data);
    const itens = parsed.itens.map(calcularItem);
    const valorProdutos = roundMoney(itens.reduce((sum, item) => sum + item.valorProduto, 0));
    const valorTributos = roundMoney(itens.reduce((sum, item) => sum + item.valorTributos, 0));
    const valorTotal = roundMoney(itens.reduce((sum, item) => sum + item.valorTotal, 0));

    return prisma.$transaction(async (tx) => {
      const nota = await tx.notaFiscal.create({
        data: {
          tipo: parsed.tipo,
          modelo: parsed.modelo ?? "NFE",
          finalidade: parsed.finalidade ?? "NORMAL",
          status: parsed.status ?? "REGISTRADA",
          numero: emptyToNull(parsed.numero),
          serie: emptyToNull(parsed.serie),
          chaveAcesso: emptyToNull(parsed.chaveAcesso),
          protocolo: emptyToNull(parsed.protocolo),
          emissorNome: emptyToNull(parsed.emissorNome),
          emissorDocumento: emptyToNull(parsed.emissorDocumento),
          destinatarioNome: emptyToNull(parsed.destinatarioNome),
          destinatarioDocumento: emptyToNull(parsed.destinatarioDocumento),
          dataEntradaSaida: parsed.dataEntradaSaida ? new Date(parsed.dataEntradaSaida) : null,
          integrationProvider: emptyToNull(parsed.integrationProvider),
          externalId: emptyToNull(parsed.externalId),
          observacoes: emptyToNull(parsed.observacoes),
          valorProdutos,
          valorTributos,
          valorTotal,
          itens: {
            create: itens.map((item) => ({
              produtoId: item.produtoId,
              codigo: emptyToNull(item.codigo),
              descricao: item.descricao,
              ncm: emptyToNull(item.ncm),
              cest: emptyToNull(item.cest),
              cfop: emptyToNull(item.cfop),
              origem: emptyToNull(item.origem),
              cstIcms: emptyToNull(item.cstIcms),
              csosn: emptyToNull(item.csosn),
              quantidade: item.quantidade,
              valorUnitario: item.valorUnitario,
              valorProduto: item.valorProduto,
              aliquotaIcms: item.aliquotaIcms,
              valorIcms: item.valorIcms,
              aliquotaPis: item.aliquotaPis,
              valorPis: item.valorPis,
              aliquotaCofins: item.aliquotaCofins,
              valorCofins: item.valorCofins,
              aliquotaIpi: item.aliquotaIpi,
              valorIpi: item.valorIpi,
              valorTributos: item.valorTributos,
              valorTotal: item.valorTotal,
              movimentaEstoque: item.movimentaEstoque,
            })),
          },
        },
        include: { itens: true },
      });

      for (const item of itens) {
        if (!item.produtoId || !item.movimentaEstoque) continue;
        await tx.produto.update({
          where: { id: item.produtoId },
          data: {
            estoque: {
              [parsed.tipo === "ENTRADA" ? "increment" : "decrement"]: Math.trunc(item.quantidade),
            },
          },
        });
      }

      return nota;
    });
  }

  async atualizarTributacaoProduto(id: string, data: Record<string, unknown>) {
    const schema = z.object({
      ncm: z.string().optional(),
      cest: z.string().optional(),
      cfop: z.string().optional(),
      origem: z.string().optional(),
      cstIcms: z.string().optional(),
      csosn: z.string().optional(),
      aliquotaIcms: z.number().optional(),
      aliquotaPis: z.number().optional(),
      aliquotaCofins: z.number().optional(),
      aliquotaIpi: z.number().optional(),
    });

    return prisma.produto.update({
      where: { id },
      data: schema.parse(data),
    });
  }
}
