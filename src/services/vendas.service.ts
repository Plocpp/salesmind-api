// 📦 VENDAS - Serviço de Vendas
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// 📋 Schemas de Validação
const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  telefone: z.string().optional(),
  email: z.string().email().optional(),
});

const itemVendaSchema = z.object({
  produtoId: z.string(),
  quantidade: z.number().positive(),
  precoUnitario: z.number().positive(),
  desconto: z.number().default(0),
});

const vendaSchema = z.object({
  clienteId: z.string().optional(),
  itens: z.array(itemVendaSchema).min(1, 'Pelo menos um item é necessário'),
});

export class VendasService {

  // 👤 CRIAR CLIENTE
  async criarCliente(data: z.infer<typeof clienteSchema>) {
    const clienteValidado = clienteSchema.parse(data);

    return await prisma.cliente.create({
      data: clienteValidado,
    });
  }

  // 🔍 BUSCAR CLIENTE POR TELEFONE OU EMAIL
  async buscarCliente(telefone?: string, email?: string) {
    if (!telefone && !email) {
      throw new Error('Telefone ou email deve ser fornecido');
    }

    return await prisma.cliente.findFirst({
      where: {
        OR: [
          telefone ? { telefone } : {},
          email ? { email } : {},
        ].filter(condition => Object.keys(condition).length > 0),
      },
    });
  }

  // 📦 BUSCAR PRODUTO
  async buscarProduto(filtro: {
    nome?: string;
    codigo?: string;
    codigoBarras?: string;
  }) {
    const { nome, codigo, codigoBarras } = filtro;

    if (!nome && !codigo && !codigoBarras) {
      throw new Error('Pelo menos um critério de busca deve ser fornecido');
    }

    return await prisma.produto.findFirst({
      where: {
        AND: [
          nome ? { nome: { contains: nome, mode: 'insensitive' } } : {},
          codigo ? { codigo } : {},
          codigoBarras ? { codigoBarras } : {},
          { estoque: { gt: 0 } }, // Apenas produtos com estoque
        ].filter(condition => Object.keys(condition).length > 0),
      },
    });
  }

  // 🛒 CRIAR VENDA
  async criarVenda(data: z.infer<typeof vendaSchema>, usuarioId: string) {
    const vendaValidada = vendaSchema.parse(data);

    // Calcular total
    let total = 0;
    for (const item of vendaValidada.itens) {
      const subtotal = (item.quantidade * item.precoUnitario) - item.desconto;
      total += subtotal;
    }

    // Verificar estoque e atualizar
    for (const item of vendaValidada.itens) {
      const produto = await prisma.produto.findUnique({
        where: { id: item.produtoId },
      });

      if (!produto) {
        throw new Error(`Produto ${item.produtoId} não encontrado`);
      }

      if (produto.estoque < item.quantidade) {
        throw new Error(`Estoque insuficiente para ${produto.nome}`);
      }
    }

    // Criar venda em transação
    return await prisma.$transaction(async (tx) => {
      const venda = await tx.venda.create({
        data: {
          total,
          usuarioId,
          clienteId: vendaValidada.clienteId,
          itens: {
            create: vendaValidada.itens.map(item => ({
              produtoId: item.produtoId,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              desconto: item.desconto,
            })),
          },
        },
        include: {
          itens: {
            include: {
              produto: true,
            },
          },
          cliente: true,
          usuario: true,
        },
      });

      // Atualizar estoque
      for (const item of vendaValidada.itens) {
        await tx.produto.update({
          where: { id: item.produtoId },
          data: {
            estoque: {
              decrement: item.quantidade,
            },
          },
        });
      }

      return venda;
    });
  }

  // 📊 LISTAR VENDAS
  async listarVendas(usuarioId?: string) {
    return await prisma.venda.findMany({
      where: usuarioId ? { usuarioId } : {},
      include: {
        itens: {
          include: {
            produto: true,
          },
        },
        cliente: true,
        usuario: true,
      },
      orderBy: {
        data: 'desc',
      },
    });
  }

  // 📈 DASHBOARD DE VENDAS
  async dashboardVendas() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const [vendasHoje, totalVendas, receitaTotal, produtosMaisVendidos] = await Promise.all([
      // Vendas de hoje
      prisma.venda.count({
        where: {
          data: {
            gte: hoje,
          },
        },
      }),

      // Total de vendas
      prisma.venda.count(),

      // Receita total
      prisma.venda.aggregate({
        _sum: {
          total: true,
        },
      }),

      // Produtos mais vendidos
      prisma.itemVenda.groupBy({
        by: ['produtoId'],
        _sum: {
          quantidade: true,
        },
        orderBy: {
          _sum: {
            quantidade: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    // Buscar nomes dos produtos mais vendidos
    const produtosComNomes = await Promise.all(
      produtosMaisVendidos.map(async (item) => {
        const produto = await prisma.produto.findUnique({
          where: { id: item.produtoId },
          select: { nome: true },
        });
        return {
          produto: produto?.nome || 'Produto não encontrado',
          quantidade: item._sum.quantidade || 0,
        };
      })
    );

    return {
      vendasHoje,
      totalVendas,
      receitaTotal: receitaTotal._sum.total || 0,
      produtosMaisVendidos: produtosComNomes,
    };
  }
}