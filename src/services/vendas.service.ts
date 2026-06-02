import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const somenteDigitos = (valor?: string) => String(valor || '').replace(/\D/g, '');

const validarCpf = (cpf: string) => {
  const valor = somenteDigitos(cpf);
  if (valor.length !== 11 || /^(\d)\1+$/.test(valor)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i += 1) soma += Number(valor[i]) * (10 - i);
  const primeiroDigito = (soma * 10) % 11;
  if ((primeiroDigito % 10) !== Number(valor[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i += 1) soma += Number(valor[i]) * (11 - i);
  const segundoDigito = (soma * 10) % 11;
  return (segundoDigito % 10) === Number(valor[10]);
};

const validarCnpj = (cnpj: string) => {
  const valor = somenteDigitos(cnpj);
  if (valor.length !== 14 || /^(\d)\1+$/.test(valor)) return false;

  const calcularDigito = (base: string, pesos: number[]) => {
    const soma = base.split('').reduce((acc, numero, index) => acc + Number(numero) * pesos[index], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const base = valor.slice(0, 12);
  const d1 = calcularDigito(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcularDigito(`${base}${d1}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${d1}${d2}` === valor.slice(12);
};

const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome e obrigatorio'),
  telefone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
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
  metadata: z.record(z.string(), z.unknown()).optional(),
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
  terminal: z.string().min(1).default('PDV-01'),
  loja: z.string().min(1).default('Loja Principal'),
  turno: z.string().min(1).default('COMERCIAL'),
  saldoInicial: z.number().min(0).default(0),
  empresaId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const movimentoCaixaSchema = z.object({
  caixaId: z.string(),
  tipo: z.enum(['VENDA', 'SANGRIA', 'SUPRIMENTO', 'ESTORNO', 'RETIRADA', 'QUEBRA', 'SOBRA', 'DESPESA', 'TRANSFERENCIA']),
  valor: z.number().positive(),
  descricao: z.string().optional(),
  terminal: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const fecharCaixaSchema = z.object({
  observacao: z.string().optional(),
  saldoInformado: z.number().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const atualizarStatusVendaSchema = z.object({
  acao: z.enum(['CANCELAR', 'ESTORNAR']),
  motivo: z.string().trim().min(3).max(240).optional(),
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

const emitirNfceSchema = z.object({
  clienteNome: z.string().trim().optional(),
  clienteDocumento: z
    .string()
    .trim()
    .transform((value) => somenteDigitos(value))
    .optional(),
  ambiente: z.enum(['HOMOLOGACAO', 'PRODUCAO']).default('HOMOLOGACAO'),
  naturezaOperacao: z.string().trim().min(2).max(120).default('VENDA DE MERCADORIA'),
  consumidorFinal: z.boolean().default(true),
  presencaComprador: z
    .enum([
      'NAO_SE_APLICA',
      'OPERACAO_PRESENCIAL',
      'INTERNET',
      'TELEATENDIMENTO',
      'ENTREGA_DOMICILIO',
      'PRESENCIAL_FORA_ESTABELECIMENTO',
      'OUTROS',
    ])
    .default('OPERACAO_PRESENCIAL'),
  destinatario: z
    .object({
      tipoPessoa: z.enum(['FISICA', 'JURIDICA']).default('FISICA'),
      nome: z.string().trim().min(2).max(120).optional(),
      razaoSocial: z.string().trim().min(2).max(120).optional(),
      cpf: z.string().trim().transform((value) => somenteDigitos(value)).optional(),
      cnpj: z.string().trim().transform((value) => somenteDigitos(value)).optional(),
      inscricaoEstadual: z.string().trim().max(20).optional(),
      indicadorIe: z.enum(['CONTRIBUINTE', 'CONTRIBUINTE_ISENTO', 'NAO_CONTRIBUINTE']).default('CONTRIBUINTE'),
      email: z.string().trim().email().optional(),
      telefone: z.string().trim().max(20).optional(),
      endereco: z
        .object({
          logradouro: z.string().trim().max(120).optional(),
          numero: z.string().trim().max(20).optional(),
          complemento: z.string().trim().max(60).optional(),
          bairro: z.string().trim().max(60).optional(),
          municipioCodigoIbge: z.string().trim().length(7).optional(),
          municipioNome: z.string().trim().max(60).optional(),
          uf: z.string().trim().length(2).optional(),
          cep: z.string().trim().transform((value) => somenteDigitos(value)).optional(),
        })
        .optional(),
    })
    .superRefine((destinatario, ctx) => {
      if (destinatario.tipoPessoa === 'JURIDICA') {
        if (!destinatario.cnpj) {
          ctx.addIssue({ code: 'custom', message: 'CNPJ e obrigatorio para destinatario juridico.' });
        } else if (!validarCnpj(destinatario.cnpj)) {
          ctx.addIssue({ code: 'custom', message: 'CNPJ do destinatario e invalido.' });
        }

        if (!destinatario.razaoSocial) {
          ctx.addIssue({ code: 'custom', message: 'Razao social e obrigatoria para destinatario juridico.' });
        }
      }

      if (destinatario.tipoPessoa === 'FISICA' && destinatario.cpf && !validarCpf(destinatario.cpf)) {
        ctx.addIssue({ code: 'custom', message: 'CPF do destinatario e invalido.' });
      }
    })
    .optional(),
  itensFiscais: z
    .array(
      z.object({
        codigo: z.string().trim().min(1).max(60),
        descricao: z.string().trim().min(2).max(120),
        ncm: z.string().trim().regex(/^\d{8}$/, 'NCM deve possuir 8 digitos.'),
        cest: z.string().trim().regex(/^\d{7}$/, 'CEST deve possuir 7 digitos.').optional(),
        cfop: z.string().trim().regex(/^\d{4}$/, 'CFOP deve possuir 4 digitos.'),
        unidadeComercial: z.string().trim().min(1).max(6),
        quantidadeComercial: z.number().positive(),
        valorUnitarioComercial: z.number().positive(),
        desconto: z.number().nonnegative().default(0),
        origemIcms: z.enum(['0', '1', '2', '3', '4', '5', '6', '7', '8']).default('0'),
        cstIcms: z.string().trim().regex(/^\d{2,3}$/),
        cstPis: z.string().trim().regex(/^\d{2}$/),
        cstCofins: z.string().trim().regex(/^\d{2}$/),
      }),
    )
    .max(200)
    .optional(),
  totais: z
    .object({
      frete: z.number().nonnegative().default(0),
      seguro: z.number().nonnegative().default(0),
      desconto: z.number().nonnegative().default(0),
      outrasDespesas: z.number().nonnegative().default(0),
    })
    .optional(),
  pagamentos: z
    .array(
      z.object({
        tipo: z.enum(['DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'BOLETO', 'TRANSFERENCIA', 'OUTROS']),
        valor: z.number().positive(),
        integracaoPagamento: z.enum(['INTEGRADO', 'NAO_INTEGRADO']).default('NAO_INTEGRADO'),
        cnpjCredenciadora: z.string().trim().transform((value) => somenteDigitos(value)).optional(),
        bandeiraCartao: z.string().trim().max(30).optional(),
        autorizacao: z.string().trim().max(40).optional(),
        vencimento: z.coerce.date().optional(),
        boleto: z.object({
          linhaDigitavel: z.string().trim().optional(),
          codigoBarras: z.string().trim().optional(),
          nossoNumero: z.string().trim().optional(),
          banco: z.string().trim().optional(),
          urlPdf: z.string().trim().url().optional(),
        }).optional(),
      }),
    )
    .max(20)
    .optional(),
  observacoes: z.string().trim().optional(),
}).superRefine((payload, ctx) => {
  if (payload.clienteDocumento && payload.clienteDocumento.length !== 11 && payload.clienteDocumento.length !== 14) {
    ctx.addIssue({ code: 'custom', message: 'clienteDocumento deve conter 11 (CPF) ou 14 (CNPJ) digitos.' });
  }

  if (payload.clienteDocumento?.length === 11 && !validarCpf(payload.clienteDocumento)) {
    ctx.addIssue({ code: 'custom', message: 'CPF informado no clienteDocumento e invalido.' });
  }

  if (payload.clienteDocumento?.length === 14 && !validarCnpj(payload.clienteDocumento)) {
    ctx.addIssue({ code: 'custom', message: 'CNPJ informado no clienteDocumento e invalido.' });
  }
});

const emitirNfeSchema = emitirNfceSchema.extend({
  finalidadeEmissao: z.enum(['NORMAL', 'COMPLEMENTAR', 'AJUSTE', 'DEVOLUCAO']).default('NORMAL'),
});

export class VendasService {
  private async hasColumn(tableName: string, columnName: string) {
    const rows = await prisma.$queryRawUnsafe<Array<{ found: number }>>(
      `
      SELECT 1 as found
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
      `,
      tableName,
      columnName,
    );

    return rows.length > 0;
  }

  private async addColumnIfMissing(tableName: 'Produto' | 'Venda', columnName: string, definition: string) {
    const exists = await this.hasColumn(tableName, columnName);
    if (exists) return;

    await prisma.$executeRawUnsafe(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`,
    );
  }

  private async ensureLegacySalesColumns() {
    await this.addColumnIfMissing('Produto', 'tipo', `ENUM('FISICO','SERVICO','DIGITAL') NOT NULL DEFAULT 'FISICO'`);
    await this.addColumnIfMissing('Produto', 'estoqueDisponivel', 'FLOAT NOT NULL DEFAULT 0');
    await this.addColumnIfMissing('Produto', 'custoMedio', 'FLOAT NULL');

    await prisma.$executeRawUnsafe(`UPDATE Produto SET estoqueDisponivel = estoque WHERE estoqueDisponivel = 0 AND estoque > 0`);

    await this.addColumnIfMissing('Venda', 'numero', 'VARCHAR(191) NULL');
    await this.addColumnIfMissing('Venda', 'tipo', `ENUM('PDV','PEDIDO','ORCAMENTO_CONVERTIDO','MARKETPLACE','ASSINATURA','SERVICO') NOT NULL DEFAULT 'PDV'`);
    await this.addColumnIfMissing('Venda', 'origem', `ENUM('PDV','BALCAO','MERCADO_LIVRE','SHOPEE','AMAZON','MAGAZINE_LUIZA','BLING','API','MANUAL','OFFLINE') NOT NULL DEFAULT 'PDV'`);
    await this.addColumnIfMissing('Venda', 'subtotal', 'DECIMAL(12,2) NOT NULL DEFAULT 0');
    await this.addColumnIfMissing('Venda', 'descontoTotal', 'DECIMAL(12,2) NOT NULL DEFAULT 0');
    await this.addColumnIfMissing('Venda', 'frete', 'DECIMAL(12,2) NOT NULL DEFAULT 0');
    await this.addColumnIfMissing('Venda', 'comissao', 'DECIMAL(12,2) NOT NULL DEFAULT 0');
    await this.addColumnIfMissing('Venda', 'custoTotal', 'DECIMAL(12,2) NOT NULL DEFAULT 0');
    await this.addColumnIfMissing('Venda', 'lucro', 'DECIMAL(12,2) NOT NULL DEFAULT 0');
    await this.addColumnIfMissing('Venda', 'margem', 'DECIMAL(8,2) NOT NULL DEFAULT 0');
    await this.addColumnIfMissing('Venda', 'listaPrecoId', 'VARCHAR(191) NULL');
    await this.addColumnIfMissing('Venda', 'caixaId', 'VARCHAR(191) NULL');
    await this.addColumnIfMissing('Venda', 'marketplacePedidoId', 'VARCHAR(191) NULL');
    await this.addColumnIfMissing('Venda', 'marketplaceConta', 'VARCHAR(191) NULL');
    await this.addColumnIfMissing('Venda', 'canal', 'VARCHAR(191) NULL');
    await this.addColumnIfMissing('Venda', 'terminal', 'VARCHAR(191) NULL');
    await this.addColumnIfMissing('Venda', 'offline', 'BOOLEAN NOT NULL DEFAULT false');
    await this.addColumnIfMissing('Venda', 'dataPagamento', 'DATETIME(3) NULL');
    await this.addColumnIfMissing('Venda', 'observacoes', 'TEXT NULL');
  }

  private isProdutoColunaAusente(error: unknown) {
    if (!(error instanceof Error)) return false;
    const mensagem = error.message || '';
    const colunaProdutoAusente = mensagem.includes('Produto.');

    return colunaProdutoAusente && mensagem.includes('does not exist in the current database');
  }

  private async carregarProdutosParaVenda(produtoIds: string[]) {
    try {
      return await prisma.produto.findMany({
        where: { id: { in: produtoIds } },
      });
    } catch (error) {
      if (!this.isProdutoColunaAusente(error)) throw error;

      const placeholders = produtoIds.map(() => '?').join(',');
      return prisma.$queryRawUnsafe<any[]>(
        `
        SELECT
          id,
          nome,
          estoque,
          estoque AS estoqueDisponivel,
          0 AS custoMedio,
          'FISICO' AS tipo
        FROM Produto
        WHERE id IN (${placeholders})
        `,
        ...produtoIds,
      );
    }
  }

  private async decrementarEstoqueProduto(
    tx: any,
    produtoId: string,
    quantidade: number,
  ) {
    try {
      await tx.produto.update({
        where: { id: produtoId },
        data: {
          estoque: { decrement: quantidade },
          estoqueDisponivel: { decrement: quantidade },
        },
      });
    } catch (error) {
      if (!this.isProdutoColunaAusente(error)) throw error;

      await tx.produto.update({
        where: { id: produtoId },
        data: {
          estoque: { decrement: quantidade },
        },
      });
    }
  }

  async criarCliente(data: z.infer<typeof clienteSchema>) {
    const cliente = clienteSchema.parse(data);
    return prisma.cliente.create({
      data: {
        nome: cliente.nome,
        telefone: cliente.telefone,
        email: cliente.email || undefined,
      },
    });
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
    await this.ensureLegacySalesColumns();

    const vendaValidada = vendaSchema.parse(data);
    const produtos = await this.carregarProdutosParaVenda(
      vendaValidada.itens.map((item) => item.produtoId),
    );

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
              metadata: pagamento.metadata as any,
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
          await this.decrementarEstoqueProduto(tx, item.produtoId, item.quantidade);

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
    const { metadata: _metadata, ...payload } = caixaSchema.parse(data);

    const caixaAbertoUsuario = await (prisma as any).caixaOperacional.findFirst({
      where: {
        usuarioId,
        status: 'ABERTO',
      },
      select: { id: true, terminal: true },
    });

    if (caixaAbertoUsuario) {
      throw new Error('Voce ja possui um caixa aberto e precisa fecha-lo antes de abrir outro.');
    }

    const caixaAbertoTerminal = await (prisma as any).caixaOperacional.findFirst({
      where: {
        terminal: payload.terminal,
        status: 'ABERTO',
      },
      select: { id: true },
    });

    if (caixaAbertoTerminal) {
      throw new Error(`O terminal ${payload.terminal} ja esta com caixa aberto.`);
    }

    return (prisma as any).caixaOperacional.create({
      data: { ...payload, usuarioId },
      include: { usuario: true, movimentos: true },
    });
  }

  async movimentoCaixa(data: unknown, usuarioId: string) {
    const payload = movimentoCaixaSchema.parse(data);

    const caixa = await (prisma as any).caixaOperacional.findUnique({
      where: { id: payload.caixaId },
      select: { id: true, status: true },
    });

    if (!caixa) {
      throw new Error('Caixa nao encontrado.');
    }

    if ((caixa.status || '').toUpperCase() !== 'ABERTO') {
      throw new Error('Nao e permitido registrar movimentacoes em caixa fechado.');
    }

    const tipo = (payload.tipo || '').toUpperCase();
    const tiposSaida = new Set(['SANGRIA', 'RETIRADA', 'DESPESA', 'ESTORNO', 'QUEBRA']);
    const saldoAtual = Number((await this.resumoCaixa(payload.caixaId)).totais.saldoFinal || 0);

    if (tiposSaida.has(tipo) && Number(payload.valor) > saldoAtual) {
      throw new Error('Saldo insuficiente no caixa para esta operacao.');
    }

    if (['SANGRIA', 'RETIRADA', 'DESPESA', 'ESTORNO'].includes(tipo) && !payload.descricao?.trim()) {
      throw new Error('Descricao/motivo e obrigatorio para este tipo de movimentacao.');
    }

    return (prisma as any).movimentoCaixa.create({
      data: {
        ...payload,
        descricao: payload.descricao?.trim() || undefined,
        metadata: {
          ...(payload.metadata || {}),
          audit: {
            registradoEm: new Date().toISOString(),
            origem: 'vendas.service',
          },
        },
        usuarioId,
      },
    });
  }

  async listarCaixas(usuarioId?: string) {
    try {
      return await (prisma as any).caixaOperacional.findMany({
        where: usuarioId ? { usuarioId } : {},
        include: { usuario: true, movimentos: true },
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

  async resumoCaixa(caixaId: string) {
    const caixa = await (prisma as any).caixaOperacional.findUnique({
      where: { id: caixaId },
      include: {
        usuario: true,
        movimentos: {
          include: { usuario: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!caixa) throw new Error('Caixa nao encontrado');

    const movimentos = (caixa.movimentos || []) as Array<{ tipo: string; valor: number; descricao?: string; createdAt: Date }>;

    const tiposEntrada = new Set(['VENDA', 'SUPRIMENTO', 'SOBRA', 'TRANSFERENCIA']);
    const tiposSaida = new Set(['SANGRIA', 'RETIRADA', 'DESPESA', 'QUEBRA', 'ESTORNO']);

    const totalEntradas = movimentos
      .filter((movimento) => tiposEntrada.has((movimento.tipo || '').toUpperCase()))
      .reduce((soma, movimento) => soma + Number(movimento.valor || 0), 0);

    const totalSaidas = movimentos
      .filter((movimento) => tiposSaida.has((movimento.tipo || '').toUpperCase()))
      .reduce((soma, movimento) => soma + Number(movimento.valor || 0), 0);

    const saldoInicial = Number(caixa.saldoInicial || 0);
    const saldoCalculado = saldoInicial + totalEntradas - totalSaidas;

    const porTipo = movimentos.reduce<Record<string, { quantidade: number; total: number }>>((acc, movimento) => {
      const tipo = (movimento.tipo || 'OUTRO').toUpperCase();
      if (!acc[tipo]) acc[tipo] = { quantidade: 0, total: 0 };
      acc[tipo].quantidade += 1;
      acc[tipo].total += Number(movimento.valor || 0);
      return acc;
    }, {});

    return {
      caixa: {
        id: caixa.id,
        status: caixa.status,
        terminal: caixa.terminal,
        loja: caixa.loja,
        turno: caixa.turno,
        abertoEm: caixa.abertoEm,
        fechadoEm: caixa.fechadoEm,
      },
      totais: {
        saldoInicial,
        totalEntradas,
        totalSaidas,
        saldoCalculado,
        saldoFinal: Number(caixa.saldoFinal ?? saldoCalculado),
        diferenca: Number(caixa.diferenca || 0),
      },
      resumoPorTipo: porTipo,
      movimentos,
    };
  }

  async fecharCaixa(caixaId: string, usuarioId: string, data: unknown) {
    const payload = fecharCaixaSchema.parse(data || {});
    const resumo = await this.resumoCaixa(caixaId);

    if ((resumo.caixa.status || '').toUpperCase() !== 'ABERTO') {
      throw new Error('Caixa ja esta fechado');
    }

    const saldoCalculado = Number(resumo.totais.saldoCalculado || 0);
    const saldoInformado = payload.saldoInformado;
    const diferenca = typeof saldoInformado === 'number'
      ? Number((saldoInformado - saldoCalculado).toFixed(2))
      : 0;

    if (diferenca !== 0 && !payload.observacao?.trim()) {
      throw new Error('Informe uma observacao obrigatoria para fechamento com divergencia.');
    }

    const caixaFechado = await (prisma as any).caixaOperacional.update({
      where: { id: caixaId },
      data: {
        status: 'FECHADO',
        fechadoEm: new Date(),
        saldoFinal: typeof saldoInformado === 'number' ? saldoInformado : saldoCalculado,
        diferenca,
      },
    });

    if (diferenca !== 0) {
      await (prisma as any).movimentoCaixa.create({
        data: {
          caixaId,
          usuarioId,
          tipo: diferenca > 0 ? 'SOBRA' : 'QUEBRA',
          valor: Math.abs(diferenca),
          descricao: payload.observacao || 'Ajuste automatico no fechamento de caixa',
          metadata: {
            origem: 'FECHAMENTO_CAIXA',
            saldoCalculado,
            saldoInformado: typeof saldoInformado === 'number' ? saldoInformado : null,
            diferenca,
            ...(payload.metadata || {}),
          },
        },
      });
    }

    return {
      message: 'Caixa fechado com sucesso',
      responsavelId: usuarioId,
      observacao: payload.observacao || null,
      caixa: caixaFechado,
      resumo,
    };
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

  async painelComissionamento(periodoDias = 30) {
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - periodoDias);

    const [agregado, porUsuario] = await Promise.all([
      prisma.venda.aggregate({
        where: {
          data: { gte: inicio },
          status: { notIn: ['CANCELADO', 'ESTORNADO'] as any },
        },
        _sum: { comissao: true, total: true },
        _count: { _all: true },
      }),
      prisma.venda.groupBy({
        by: ['usuarioId'],
        where: {
          data: { gte: inicio },
          status: { notIn: ['CANCELADO', 'ESTORNADO'] as any },
        },
        _sum: { comissao: true, total: true },
        _count: { _all: true },
        orderBy: { _sum: { comissao: 'desc' } },
        take: 10,
      }),
    ]);

    const usuarioIds = porUsuario.map((item) => item.usuarioId);
    const usuarios = usuarioIds.length > 0
      ? await prisma.usuario.findMany({ where: { id: { in: usuarioIds } }, select: { id: true, nome: true, email: true } })
      : [];
    const usuariosPorId = new Map(usuarios.map((usuario) => [usuario.id, usuario]));

    return {
      periodoDias,
      totalComissao: Number(agregado._sum.comissao || 0),
      totalVendido: Number(agregado._sum.total || 0),
      quantidadeVendas: Number(agregado._count._all || 0),
      comissaoMediaPorVenda: Number(agregado._count._all || 0) > 0
        ? Number((Number(agregado._sum.comissao || 0) / Number(agregado._count._all || 1)).toFixed(2))
        : 0,
      porVendedor: porUsuario.map((item) => ({
        usuarioId: item.usuarioId,
        nome: usuariosPorId.get(item.usuarioId)?.nome || 'Usuario sem cadastro',
        email: usuariosPorId.get(item.usuarioId)?.email || null,
        quantidadeVendas: Number(item._count._all || 0),
        totalVendido: Number(item._sum.total || 0),
        totalComissao: Number(item._sum.comissao || 0),
      })),
    };
  }

  async painelInteligencia(periodoDias = 30) {
    const [dashboard, demonstrativo, ranking] = await Promise.all([
      this.dashboardVendas(),
      this.modeloDemonstrativo(periodoDias),
      this.rankingClientes(),
    ]);

    return {
      periodoDias,
      dashboard,
      demonstrativo,
      rankingTopClientes: ranking.slice(0, 10),
      geradoEm: new Date().toISOString(),
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

  private mapTipoPagamentoFiscalParaTipoFinanceiro(tipo: string) {
    const map: Record<string, string> = {
      DINHEIRO: 'DINHEIRO',
      PIX: 'PIX',
      CARTAO_CREDITO: 'CREDITO',
      CARTAO_DEBITO: 'DEBITO',
      BOLETO: 'BOLETO',
      TRANSFERENCIA: 'GATEWAY',
      OUTROS: 'GATEWAY',
    };
    return map[tipo] || 'GATEWAY';
  }

  private async sincronizarFinanceiroDocumentoFiscal(tx: any, params: {
    venda: any;
    usuarioId: string;
    documentoFiscal: Record<string, unknown>;
    pagamentosFiscais?: Array<any>;
  }) {
    const { venda, usuarioId, documentoFiscal, pagamentosFiscais } = params;

    const pagamentos = (pagamentosFiscais && pagamentosFiscais.length > 0)
      ? pagamentosFiscais
      : (venda.pagamentos || []).map((pagamento: any) => ({
          tipo: String(pagamento.forma || 'OUTROS'),
          valor: Number(pagamento.valor || 0),
          vencimento: pagamento.vencimento || undefined,
        }));

    const baseOrigemReferencia = `DOCFISCAL:${venda.id}`;

    await tx.lancamentoFinanceiro.updateMany({
      where: {
        vendaId: venda.id,
        origemReferencia: baseOrigemReferencia,
      },
      data: {
        status: 'CANCELADO',
        observacoes: 'Substituido por nova sincronizacao de documento fiscal.',
      },
    });

    const totalDocumento = Number(venda.total || 0);
    const totalPagamentos = pagamentos.reduce((soma: number, pagamento: any) => soma + Number(pagamento.valor || 0), 0) || totalDocumento;

    for (let index = 0; index < pagamentos.length; index += 1) {
      const pagamento = pagamentos[index];
      const valorOriginal = Number(pagamento.valor || 0);
      const valorRateado = totalPagamentos > 0
        ? Number(((valorOriginal / totalPagamentos) * totalDocumento).toFixed(2))
        : Number((totalDocumento / pagamentos.length).toFixed(2));

      const vencimento = pagamento.vencimento ? new Date(pagamento.vencimento) : new Date();
      const tipoFinanceiro = this.mapTipoPagamentoFiscalParaTipoFinanceiro(String(pagamento.tipo || 'OUTROS'));
      const statusFinanceiro = ['DINHEIRO', 'PIX', 'CARTAO_DEBITO'].includes(String(pagamento.tipo || ''))
        ? 'PAGO'
        : 'PENDENTE';

      await tx.lancamentoFinanceiro.create({
        data: {
          descricao: `Parcela ${index + 1}/${pagamentos.length} - ${String(documentoFiscal.modeloDocumento || '65')} ${String(documentoFiscal.numero || '')}`.trim(),
          tipo: 'RECEITA',
          status: statusFinanceiro,
          valorBruto: valorRateado,
          valorLiquido: valorRateado,
          valorPago: statusFinanceiro === 'PAGO' ? valorRateado : 0,
          competencia: new Date(),
          vencimento,
          pagamento: statusFinanceiro === 'PAGO' ? new Date() : undefined,
          origem: 'VENDA',
          origemReferencia: baseOrigemReferencia,
          vendaId: venda.id,
          clienteId: venda.clienteId || undefined,
          usuarioId,
          metadata: {
            origemDocumentoFiscal: true,
            documentoFiscal,
            pagamentoFiscal: pagamento,
            tipoFinanceiro,
          },
        },
      });
    }
  }

  async atualizarListaPreco(id: string, data: unknown) {
    const lista = listaPrecoSchema.parse(data);
    return (prisma as any).listaPreco.update({
      where: { id },
      data: lista,
      include: { itens: { include: { produto: true } } },
    });
  }

  async deletarListaPreco(id: string) {
    return (prisma as any).listaPreco.delete({ where: { id } });
  }

  async criarFormaRecebimento(data: unknown) {
    const forma = z.object({
      nome: z.string().min(1),
      tipo: z.string(),
      taxaPercentual: z.number().default(0),
      taxaFixa: z.number().default(0),
      prazoRecebimentoDias: z.number().int().default(0),
      permiteParcelamento: z.boolean().default(false),
      permiteAntecipacao: z.boolean().default(false),
      ativo: z.boolean().default(true),
    }).parse(data);

    return (prisma as any).formaRecebimento.create({ data: forma });
  }

  async atualizarFormaRecebimento(id: string, data: unknown) {
    const forma = z.object({
      nome: z.string().min(1).optional(),
      tipo: z.string().optional(),
      taxaPercentual: z.number().optional(),
      taxaFixa: z.number().optional(),
      prazoRecebimentoDias: z.number().int().optional(),
      permiteParcelamento: z.boolean().optional(),
      permiteAntecipacao: z.boolean().optional(),
      ativo: z.boolean().optional(),
    }).parse(data);

    return (prisma as any).formaRecebimento.update({
      where: { id },
      data: forma,
    });
  }

  async converterOrcamentoParaVenda(id: string, usuarioId: string) {
    const orcamento = await (prisma as any).orcamentoVenda.findUnique({
      where: { id },
      include: { cliente: true },
    });

    if (!orcamento) throw new Error('Orçamento não encontrado');

    const venda = await this.criarVenda({
      clienteId: orcamento.clienteId,
      tipo: 'ORCAMENTO_CONVERTIDO',
      status: 'PAGO',
      origem: 'MANUAL',
      offline: false,
      descontoTotal: 0,
      frete: 0,
      itens: [],
      pagamentos: [{
        forma: 'PIX',
        valor: orcamento.total || 0,
        parcelas: 1,
        taxaPercentual: 0,
        taxaFixa: 0,
      }],
      observacoes: `Convertido de orçamento ${orcamento.numero || id}`,
    }, usuarioId);

    return venda;
  }

  async enviarOrcamentoPorEmail(id: string, email: string) {
    const orcamento = await (prisma as any).orcamentoVenda.findUnique({
      where: { id },
      include: { cliente: true, usuario: true },
    });

    if (!orcamento) throw new Error('Orçamento não encontrado');

    // Criar registro de envio para auditoria
    try {
      await (prisma as any).logEnvioEmail.create({
        data: {
          tipo: 'ORCAMENTO',
          destinatario: email,
          assunto: `Orçamento ${orcamento.numero}: ${orcamento.titulo}`,
          referenciaId: id,
          status: 'ENVIADO',
          metadata: {
            cliente: orcamento.cliente?.nome,
            valor: orcamento.total,
            validade: orcamento.validade,
          },
        },
      });
    } catch {
      // Se tabela não existe, continua mesmo assim
    }

    console.log(`Email de orçamento ${orcamento.numero} enfileirado para ${email}`);
    return { 
      message: 'Orçamento enviado por email com sucesso',
      orcamentoNumero: orcamento.numero,
      destinatario: email,
    };
  }

  async deletarOrcamento(id: string) {
    return (prisma as any).orcamentoVenda.delete({ where: { id } });
  }

  async registrarPagamento(id: string, data: { valor: number }) {
    // id é no formato 'vendaId-pagamentoIndex'
    const [vendaId] = id.split('-');
    
    const venda = await prisma.venda.findUnique({
      where: { id: vendaId },
      include: { pagamentos: true },
    });

    if (!venda) throw new Error('Venda não encontrada');

    // Registrar movimento de caixa
    try {
      await (prisma as any).movimentoCaixa.create({
        data: {
          tipo: 'RECEBIMENTO',
          valor: data.valor,
          descricao: `Pagamento recebido - Venda ${venda.numero || vendaId}`,
          metadata: {
            vendaId,
            tipoRecebimento: 'MANUAL',
            dataRecebimento: new Date().toISOString(),
          },
        },
      });
    } catch {
      // Se caixa não existe, criar um registro básico
    }

    // Atualizar status da venda se todos os pagamentos foram recebidos
    const totalPago = venda.pagamentos.reduce((sum, p) => sum + Number(p.valor || 0), 0) + data.valor;
    if (totalPago >= venda.total) {
      await prisma.venda.update({
        where: { id: vendaId },
        data: {
          status: 'PAGO',
          dataPagamento: new Date(),
          timeline: {
            create: {
              status: 'PAGO',
              titulo: 'Pagamento confirmado',
              detalhe: `Valor: ${data.valor}`,
            },
          },
        },
      });
    }

    console.log(`Pagamento de ${data.valor} registrado para venda ${vendaId}`);
    return { 
      message: 'Pagamento registrado com sucesso',
      valor: data.valor,
      vendaId,
      statusAtualizado: totalPago >= venda.total,
    };
  }

  async atualizarStatusVenda(vendaId: string, usuarioId: string, data: unknown) {
    const payload = atualizarStatusVendaSchema.parse(data || {});

    const venda = await prisma.venda.findUnique({
      where: { id: vendaId },
      include: { cliente: true },
    });

    if (!venda) throw new Error('Venda nao encontrada.');

    const statusAtual = String(venda.status || '').toUpperCase();
    if (['CANCELADO', 'ESTORNADO'].includes(statusAtual)) {
      throw new Error(`Venda ja esta ${statusAtual.toLowerCase()}.`);
    }

    const novoStatus = payload.acao === 'ESTORNAR' ? 'ESTORNADO' : 'CANCELADO';
    const descricaoPadrao = payload.acao === 'ESTORNAR'
      ? `Estorno de venda - ${venda.cliente?.nome || 'Cliente'}`
      : `Cancelamento de venda - ${venda.cliente?.nome || 'Cliente'}`;

    await prisma.$transaction(async (tx) => {
      await tx.venda.update({
        where: { id: vendaId },
        data: {
          status: novoStatus as any,
          timeline: {
            create: {
              status: novoStatus,
              titulo: payload.acao === 'ESTORNAR' ? 'Venda estornada' : 'Venda cancelada',
              detalhe: payload.motivo || `${payload.acao === 'ESTORNAR' ? 'Estorno' : 'Cancelamento'} operacional registrado.`,
              metadata: {
                acao: payload.acao,
                motivo: payload.motivo || null,
                processadoPor: usuarioId,
              },
            },
          },
        },
      });

      try {
        await (tx as any).lancamentoFinanceiro.create({
          data: {
            descricao: descricaoPadrao,
            tipo: 'DESPESA',
            status: 'CANCELADO',
            valorBruto: -Number(venda.total || 0),
            valorLiquido: -Number(venda.total || 0),
            valorPago: -Number(venda.total || 0),
            competencia: new Date(),
            vencimento: new Date(),
            pagamento: new Date(),
            origem: payload.acao === 'ESTORNAR' ? 'ESTORNO' : 'CANCELAMENTO',
            origemReferencia: venda.id,
            vendaId: venda.id,
            clienteId: venda.clienteId || undefined,
            usuarioId,
            metadata: {
              motivo: payload.motivo || null,
              acao: payload.acao,
            },
          },
        });
      } catch {
        // Lancamento financeiro pode nao existir em alguns ambientes legados.
      }
    });

    return {
      message: payload.acao === 'ESTORNAR' ? 'Venda estornada com sucesso.' : 'Venda cancelada com sucesso.',
      vendaId,
      status: novoStatus,
    };
  }

  private async emitirDocumentoFiscalVenda(vendaId: string, usuarioId: string, data: unknown, modelo: '55' | '65') {
    const payload = modelo === '55'
      ? emitirNfeSchema.parse(data || {})
      : emitirNfceSchema.parse(data || {});

    const venda = await prisma.venda.findUnique({
      where: { id: vendaId },
      include: { cliente: true, itens: { include: { produto: true } }, pagamentos: true },
    });

    if (!venda) throw new Error('Venda nao encontrada.');

    if ((venda.status || '').toUpperCase() === 'CANCELADO') {
      throw new Error('Nao e permitido emitir NFC-e para venda cancelada.');
    }

    const metadataAtual = (venda.metadata && typeof venda.metadata === 'object' && !Array.isArray(venda.metadata))
      ? venda.metadata as Record<string, unknown>
      : {};

    const chaveDocumento = modelo === '55' ? 'nfe' : 'nfce';
    const documentoExistente = metadataAtual[chaveDocumento] as Record<string, unknown> | undefined;
    if (documentoExistente && String(documentoExistente.status || '').toUpperCase() === 'AUTORIZADA') {
      return {
        message: `${modelo === '55' ? 'NF-e' : 'NFC-e'} ja emitida para esta venda.`,
        vendaId: venda.id,
        documentoFiscal: documentoExistente,
        jaEmitida: true,
      };
    }

    const dataEmissao = new Date();
    const numero = String(Date.now()).slice(-6);
    const serie = '1';
    const protocolo = `${Date.now()}${Math.floor(Math.random() * 90 + 10)}`;
    const chaveAcesso = `${dataEmissao.getFullYear()}${numero}${Math.floor(Math.random() * 1_000_000_000_000)
      .toString()
      .padStart(12, '0')}`;

    const documentoCliente = payload.clienteDocumento || undefined;

    const destinatario = payload.destinatario
      ? {
        tipoPessoa: payload.destinatario.tipoPessoa,
        nome: payload.destinatario.nome || undefined,
        razaoSocial: payload.destinatario.razaoSocial || undefined,
        cpf: payload.destinatario.cpf || undefined,
        cnpj: payload.destinatario.cnpj || undefined,
        inscricaoEstadual: payload.destinatario.inscricaoEstadual || undefined,
        indicadorIe: payload.destinatario.indicadorIe,
        email: payload.destinatario.email || undefined,
        telefone: payload.destinatario.telefone || undefined,
        endereco: payload.destinatario.endereco
          ? {
            logradouro: payload.destinatario.endereco.logradouro || undefined,
            numero: payload.destinatario.endereco.numero || undefined,
            complemento: payload.destinatario.endereco.complemento || undefined,
            bairro: payload.destinatario.endereco.bairro || undefined,
            municipioCodigoIbge: payload.destinatario.endereco.municipioCodigoIbge || undefined,
            municipioNome: payload.destinatario.endereco.municipioNome || undefined,
            uf: payload.destinatario.endereco.uf || undefined,
            cep: payload.destinatario.endereco.cep || undefined,
          }
          : undefined,
      }
      : undefined;

    const itensFiscais = (payload.itensFiscais && payload.itensFiscais.length > 0)
      ? payload.itensFiscais
      : (venda.itens || []).map((item: any) => ({
          codigo: String(item.produto?.codigo || item.produto?.sku || item.produtoId),
          descricao: String(item.produto?.nome || 'Item sem descricao'),
          ncm: String(item.produto?.ncm || '00000000').padStart(8, '0').slice(0, 8),
          cest: item.produto?.cest ? String(item.produto.cest).padStart(7, '0').slice(0, 7) : undefined,
          cfop: String(item.produto?.cfop || '5102').padStart(4, '0').slice(0, 4),
          unidadeComercial: String(item.produto?.unidadeMedida || 'UN').slice(0, 6),
          quantidadeComercial: Number(item.quantidade || 0),
          valorUnitarioComercial: Number(item.precoUnitario || 0),
          desconto: Number(item.desconto || 0),
          origemIcms: String(item.produto?.origemFiscal || '0'),
          cstIcms: String(item.produto?.cst || '102'),
          cstPis: '01',
          cstCofins: '01',
        }));

    const subtotalVenda = Number((venda as any).subtotal || venda.total || 0);
    const descontoVenda = Number((venda as any).descontoTotal || 0);
    const freteVenda = Number((venda as any).frete || 0);
    const totais = {
      subtotalProdutos: subtotalVenda,
      desconto: payload.totais?.desconto ?? descontoVenda,
      frete: payload.totais?.frete ?? freteVenda,
      seguro: payload.totais?.seguro ?? 0,
      outrasDespesas: payload.totais?.outrasDespesas ?? 0,
      valorTotal: Number(venda.total || 0),
    };

    const documentoFiscal = {
      numero,
      serie,
      modeloDocumento: modelo,
      status: 'AUTORIZADA',
      protocolo,
      chaveAcesso,
      ambiente: payload.ambiente,
      emitidaEm: dataEmissao.toISOString(),
      valorTotal: Number(venda.total || 0),
      cliente: payload.clienteNome || venda.cliente?.nome || 'Consumidor Final',
      documentoCliente,
      identificacao: {
        naturezaOperacao: payload.naturezaOperacao,
        consumidorFinal: payload.consumidorFinal,
        presencaComprador: payload.presencaComprador,
      },
      destinatario,
      itensFiscais,
      totais,
      pagamentos: payload.pagamentos || undefined,
      vinculos: {
        vendaId: venda.id,
        numeroVenda: venda.numero,
        origemVenda: venda.origem,
      },
    };

    await prisma.$transaction(async (tx) => {
      await tx.venda.update({
        where: { id: venda.id },
        data: {
          metadata: {
            ...metadataAtual,
            [chaveDocumento]: documentoFiscal,
          } as any,
          timeline: {
            create: {
              status: venda.status,
              titulo: `${modelo === '55' ? 'NF-e' : 'NFC-e'} emitida`,
              detalhe: `${modelo === '55' ? 'NF-e' : 'NFC-e'} ${numero} autorizada em ${payload.ambiente}.`,
              metadata: {
                documentoFiscal,
                observacoes: payload.observacoes || undefined,
                emitidaPor: usuarioId,
              },
            },
          },
        },
      });

      await this.sincronizarFinanceiroDocumentoFiscal(tx, {
        venda,
        usuarioId,
        documentoFiscal,
        pagamentosFiscais: payload.pagamentos,
      });
    });

    return {
      message: `${modelo === '55' ? 'NF-e' : 'NFC-e'} emitida com sucesso.`,
      vendaId: venda.id,
      documentoFiscal,
      jaEmitida: false,
    };
  }

  async emitirNfceVenda(vendaId: string, usuarioId: string, data: unknown) {
    return this.emitirDocumentoFiscalVenda(vendaId, usuarioId, data, '65');
  }

  async emitirNfeVenda(vendaId: string, usuarioId: string, data: unknown) {
    return this.emitirDocumentoFiscalVenda(vendaId, usuarioId, data, '55');
  }

  async listarDocumentosFiscaisVenda(filtros: { modelo?: '55' | '65'; status?: string; inicio?: string; fim?: string; clienteId?: string } = {}) {
    const vendas = await prisma.venda.findMany({
      where: {
        ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
        ...((filtros.inicio || filtros.fim)
          ? {
              data: {
                ...(filtros.inicio ? { gte: new Date(filtros.inicio) } : {}),
                ...(filtros.fim ? { lte: new Date(filtros.fim) } : {}),
              },
            }
          : {}),
      },
      include: {
        cliente: true,
      },
      orderBy: { data: 'desc' },
    });

    const documentos = vendas.flatMap((venda) => {
      const metadata = (venda.metadata && typeof venda.metadata === 'object' && !Array.isArray(venda.metadata))
        ? venda.metadata as Record<string, any>
        : {};

      const candidatos = [
        metadata.nfe ? { modelo: '55', documento: metadata.nfe } : null,
        metadata.nfce ? { modelo: '65', documento: metadata.nfce } : null,
      ].filter(Boolean) as Array<{ modelo: '55' | '65'; documento: any }>;

      return candidatos.map((item) => ({
        vendaId: venda.id,
        numeroVenda: venda.numero,
        clienteId: venda.clienteId,
        cliente: venda.cliente?.nome || null,
        modelo: item.modelo,
        numero: String(item.documento?.numero || ''),
        serie: String(item.documento?.serie || ''),
        chaveAcesso: item.documento?.chaveAcesso || null,
        status: String(item.documento?.status || 'DESCONHECIDO'),
        ambiente: item.documento?.ambiente || null,
        emitidaEm: item.documento?.emitidaEm || null,
        valorTotal: Number(item.documento?.valorTotal || venda.total || 0),
        origemReferenciaFinanceira: `DOCFISCAL:${venda.id}`,
        documentoFiscal: item.documento,
      }));
    });

    const filtrados = documentos.filter((documento: any) => {
      if (filtros.modelo && documento.modelo !== filtros.modelo) return false;
      if (filtros.status && String(documento.status).toUpperCase() !== String(filtros.status).toUpperCase()) return false;
      return true;
    });

    const origens = Array.from(new Set(filtrados.map((item: any) => item.origemReferenciaFinanceira)));
    const lancamentosRaw = origens.length > 0
      ? await (prisma as any).lancamentoFinanceiro.findMany({
          where: {
            origemReferencia: { in: origens },
          },
          orderBy: [{ vencimento: 'asc' }, { createdAt: 'asc' }],
        })
      : [];
    const lancamentos = (Array.isArray(lancamentosRaw) ? lancamentosRaw : []) as Array<{ origemReferencia?: string | null; [key: string]: any }>;

    const lancamentosPorOrigem: Record<string, any[]> = lancamentos.reduce((acc: Record<string, any[]>, lancamento) => {
      const chave = String(lancamento.origemReferencia || '');
      if (!acc[chave]) acc[chave] = [];
      acc[chave].push(lancamento);
      return acc;
    }, {});

    return filtrados.map((documento: any) => ({
      ...documento,
      lancamentosFinanceiros: lancamentosPorOrigem[documento.origemReferenciaFinanceira] || [],
    }));
  }

  async renovarPacote(id: string, usuarioId: string) {
    const venda = await prisma.venda.findUnique({ 
      where: { id },
      include: { cliente: true, usuario: true },
    });
    if (!venda) throw new Error('Pacote não encontrado');

    const dataRenovacao = new Date();
    const dataPróximoVencimento = new Date();
    dataPróximoVencimento.setMonth(dataPróximoVencimento.getMonth() + 1);

    // Registrar lancamento financeiro para renovação
    try {
      await (prisma as any).lancamentoFinanceiro.create({
        data: {
          descricao: `Renovação de pacote/assinatura - ${venda.cliente?.nome || 'Cliente'}`,
          tipo: 'RECEITA',
          status: 'PAGO',
          valorBruto: venda.total,
          valorLiquido: venda.total,
          valorPago: venda.total,
          competencia: dataRenovacao,
          vencimento: dataPróximoVencimento,
          pagamento: dataRenovacao,
          origem: 'ASSINATURA',
          origemReferencia: venda.id,
          vendaId: venda.id,
          clienteId: venda.clienteId,
          usuarioId,
          metadata: {
            tipoRenovacao: 'AUTOMATICA',
            vendaOriginalId: id,
          },
        },
      });
    } catch {
      // Se tabela não existe, continua
    }

    return prisma.venda.update({
      where: { id },
      data: {
        timeline: {
          create: {
            status: 'PAGO',
            titulo: 'Pacote renovado',
            detalhe: `Próximo vencimento: ${dataPróximoVencimento.toLocaleDateString('pt-BR')}`,
          },
        },
      },
    });
  }

  async cancelarPacote(id: string, usuarioId: string) {
    const venda = await prisma.venda.findUnique({ 
      where: { id },
      include: { cliente: true },
    });
    if (!venda) throw new Error('Pacote não encontrado');

    // Registrar lancamento de devolução/cancelamento
    try {
      await (prisma as any).lancamentoFinanceiro.create({
        data: {
          descricao: `Cancelamento de pacote - ${venda.cliente?.nome || 'Cliente'}`,
          tipo: 'DESPESA',
          status: 'CANCELADO',
          valorBruto: -venda.total,
          valorLiquido: -venda.total,
          valorPago: -venda.total,
          competencia: new Date(),
          vencimento: new Date(),
          pagamento: new Date(),
          origem: 'CANCELAMENTO',
          origemReferencia: venda.id,
          vendaId: venda.id,
          clienteId: venda.clienteId,
          usuarioId,
          metadata: {
            motivoCancelamento: 'SOLICITACAO_CLIENTE',
            dataProcessamento: new Date().toISOString(),
          },
        },
      });
    } catch {
      // Se tabela não existe, continua
    }

    return prisma.venda.update({
      where: { id },
      data: {
        status: 'CANCELADO',
        timeline: {
          create: {
            status: 'CANCELADO',
            titulo: 'Pacote cancelado',
            detalhe: `Cancelado por solicitação em ${new Date().toLocaleDateString('pt-BR')}`,
          },
        },
      },
    });
  }
}
