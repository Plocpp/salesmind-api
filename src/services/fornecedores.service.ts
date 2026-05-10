// 🏭 FORNECEDORES E MARCAS - Serviço
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// 📋 Schemas de Validação
const fornecedorSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional(),
  endereco: z.string().optional(),
});

const marcaSchema = z.object({
  nome: z.string().min(1, 'Nome da marca é obrigatório'),
  fornecedorId: z.string(),
});

const produtoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  peso: z.number().positive(),
  porte: z.string().min(1, 'Porte é obrigatório'),
  preco: z.number().positive(),
  precoCusto: z.number().optional(),
  estoque: z.number().int().min(0),
  codigo: z.string().optional(),
  codigoBarras: z.string().optional(),
  cor: z.string().optional(),
  tamanho: z.string().optional(),
  validade: z.date().optional(),
  marcaId: z.string(),
  usuarioId: z.string().min(1, 'Usuario obrigatorio'),
});

const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  telefone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

const clienteCompletoSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatorio'),
  telefone: z.string().optional(),
  cpf: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  dataNascimento: z.string().optional().or(z.literal('')),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  observacoes: z.string().optional(),
});

type ClienteInput = z.infer<typeof clienteCompletoSchema>;

function normalizarCliente(data: Partial<ClienteInput>) {
  const cliente = clienteCompletoSchema.partial().parse(data);

  return {
    ...cliente,
    email: cliente.email?.trim() || null,
    cpf: cliente.cpf?.trim() || null,
    telefone: cliente.telefone?.trim() || null,
    dataNascimento: cliente.dataNascimento ? new Date(cliente.dataNascimento) : null,
    cep: cliente.cep?.trim() || null,
    endereco: cliente.endereco?.trim() || null,
    numero: cliente.numero?.trim() || null,
    complemento: cliente.complemento?.trim() || null,
    bairro: cliente.bairro?.trim() || null,
    cidade: cliente.cidade?.trim() || null,
    estado: cliente.estado?.trim().toUpperCase() || null,
    observacoes: cliente.observacoes?.trim() || null,
  };
}

export class FornecedoresMarcasService {

  // 🏭 CRIAR FORNECEDOR
  async criarFornecedor(data: z.infer<typeof fornecedorSchema>) {
    const fornecedorValidado = fornecedorSchema.parse(data);

    return await prisma.fornecedor.create({
      data: fornecedorValidado,
    });
  }

  // 🏭 LISTAR FORNECEDORES
  async listarFornecedores() {
    return await prisma.fornecedor.findMany({
      include: {
        marcas: true,
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }

  // 🏭 BUSCAR FORNECEDOR POR ID
  async buscarFornecedorPorId(id: string) {
    return await prisma.fornecedor.findUnique({
      where: { id },
      include: {
        marcas: true,
      },
    });
  }

  // 🏭 ATUALIZAR FORNECEDOR
  async atualizarFornecedor(id: string, data: Partial<z.infer<typeof fornecedorSchema>>) {
    return await prisma.fornecedor.update({
      where: { id },
      data,
    });
  }

  // 🏭 DELETAR FORNECEDOR
  async deletarFornecedor(id: string) {
    // Verificar se tem marcas vinculadas
    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id },
      include: { marcas: true },
    });

    if (fornecedor?.marcas.length) {
      throw new Error('Não é possível deletar fornecedor com marcas vinculadas');
    }

    return await prisma.fornecedor.delete({
      where: { id },
    });
  }

  // 🏷️ CRIAR MARCA
  async criarMarca(data: z.infer<typeof marcaSchema>) {
    const marcaValidada = marcaSchema.parse(data);

    return await prisma.marca.create({
      data: marcaValidada,
      include: {
        fornecedor: true,
      },
    });
  }

  // 🏷️ LISTAR MARCAS
  async listarMarcas() {
    return await prisma.marca.findMany({
      include: {
        fornecedor: true,
        produtos: true,
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }

  // 🏷️ BUSCAR MARCA POR ID
  async buscarMarcaPorId(id: string) {
    return await prisma.marca.findUnique({
      where: { id },
      include: {
        fornecedor: true,
        produtos: true,
      },
    });
  }

  // 🏷️ ATUALIZAR MARCA
  async atualizarMarca(id: string, data: Partial<z.infer<typeof marcaSchema>>) {
    return await prisma.marca.update({
      where: { id },
      data,
      include: {
        fornecedor: true,
      },
    });
  }

  // 🏷️ DELETAR MARCA
  async deletarMarca(id: string) {
    // Verificar se tem produtos vinculados
    const marca = await prisma.marca.findUnique({
      where: { id },
      include: { produtos: true },
    });

    if (marca?.produtos.length) {
      throw new Error('Não é possível deletar marca com produtos vinculados');
    }

    return await prisma.marca.delete({
      where: { id },
    });
  }

  // 📦 CRIAR PRODUTO COM MARCA
  async criarProduto(data: z.infer<typeof produtoSchema>) {
    const produtoValidado = produtoSchema.parse(data);

    return await prisma.produto.create({
      data: produtoValidado,
      include: {
        marca: {
          include: {
            fornecedor: true,
          },
        },
        usuario: true,
      },
    });
  }

  // 📦 LISTAR PRODUTOS COM MARCAS E FORNECEDORES
  async listarProdutos() {
    return await prisma.produto.findMany({
      include: {
        marca: {
          include: {
            fornecedor: true,
          },
        },
        usuario: true,
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }

  // 📦 BUSCAR PRODUTO POR ID
  async buscarProdutoPorId(id: string) {
    return await prisma.produto.findUnique({
      where: { id },
      include: {
        marca: {
          include: {
            fornecedor: true,
          },
        },
        usuario: true,
      },
    });
  }

  // 📦 ATUALIZAR PRODUTO
  async atualizarProduto(id: string, data: Partial<z.infer<typeof produtoSchema>>) {
    return await prisma.produto.update({
      where: { id },
      data,
      include: {
        marca: {
          include: {
            fornecedor: true,
          },
        },
        usuario: true,
      },
    });
  }

  // 📦 DELETAR PRODUTO
  async deletarProduto(id: string) {
    return await prisma.produto.delete({
      where: { id },
    });
  }

  // CLIENTES
  async criarCliente(data: ClienteInput) {
    const parsed = clienteCompletoSchema.parse(data);
    const clienteValidado = {
      ...normalizarCliente(parsed),
      nome: parsed.nome.trim(),
    };

    return await prisma.cliente.create({
      data: clienteValidado,
    });
  }

  async listarClientes() {
    return await prisma.cliente.findMany({
      orderBy: {
        nome: 'asc',
      },
    });
  }

  async buscarClientePorId(id: string) {
    return await prisma.cliente.findUnique({
      where: { id },
    });
  }

  async atualizarCliente(id: string, data: Partial<ClienteInput>) {
    const clienteValidado = normalizarCliente(data);

    return await prisma.cliente.update({
      where: { id },
      data: clienteValidado,
    });
  }

  async deletarCliente(id: string) {
    return await prisma.cliente.delete({
      where: { id },
    });
  }

  // 📊 DASHBOARD DE FORNECEDORES
  async dashboardFornecedores() {
    const [totalFornecedores, totalMarcas, fornecedoresAtivos] = await Promise.all([
      // Total de fornecedores
      prisma.fornecedor.count(),

      // Total de marcas
      prisma.marca.count(),

      // Fornecedores com mais produtos
      prisma.fornecedor.findMany({
        include: {
          marcas: {
            include: {
              produtos: true,
            },
          },
        },
      }),
    ]);

    const fornecedoresComProdutos = fornecedoresAtivos.map(fornecedor => ({
      fornecedor: fornecedor.nome,
      marcas: fornecedor.marcas.length,
      produtos: fornecedor.marcas.reduce((total, marca) => total + marca.produtos.length, 0),
    }));

    return {
      totalFornecedores,
      totalMarcas,
      fornecedoresAtivos: fornecedoresComProdutos,
    };
  }
}
