import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const vendedorSchema = z.object({
  nome: z.string().min(1, "Nome obrigatorio"),
  email: z.string().email().optional().or(z.literal("")),
  telefone: z.string().optional(),
  cpf: z.string().optional(),
  endereco: z.string().optional(),
  ativo: z.boolean().optional(),
});

const veiculoSchema = z.object({
  placa: z.string().min(1, "Placa obrigatoria"),
  modelo: z.string().min(1, "Modelo obrigatorio"),
  ano: z.number().int().optional().nullable(),
  marca: z.string().optional(),
  cor: z.string().optional(),
  capacidade: z.number().optional().nullable(),
  ativo: z.boolean().optional(),
});

const entregadorSchema = z.object({
  nome: z.string().min(1, "Nome obrigatorio"),
  email: z.string().email().optional().or(z.literal("")),
  telefone: z.string().optional(),
  cpf: z.string().optional(),
  endereco: z.string().optional(),
  veiculoId: z.string().optional().or(z.literal("")),
  ativo: z.boolean().optional(),
});

type VendedorInput = z.infer<typeof vendedorSchema>;
type VeiculoInput = z.infer<typeof veiculoSchema>;
type EntregadorInput = z.infer<typeof entregadorSchema>;

function emptyToNull(value?: string | null) {
  return value?.trim() || null;
}

export class CadastrosAuxiliaresService {
  async listarVendedores() {
    return prisma.vendedor.findMany({ orderBy: { nome: "asc" } });
  }

  async criarVendedor(data: VendedorInput) {
    const parsed = vendedorSchema.parse(data);
    return prisma.vendedor.create({
      data: {
        nome: parsed.nome.trim(),
        email: emptyToNull(parsed.email),
        telefone: emptyToNull(parsed.telefone),
        cpf: emptyToNull(parsed.cpf),
        endereco: emptyToNull(parsed.endereco),
        ativo: parsed.ativo ?? true,
      },
    });
  }

  async atualizarVendedor(id: string, data: Partial<VendedorInput>) {
    const parsed = vendedorSchema.partial().parse(data);
    return prisma.vendedor.update({
      where: { id },
      data: {
        ...parsed,
        email: parsed.email !== undefined ? emptyToNull(parsed.email) : undefined,
        telefone: parsed.telefone !== undefined ? emptyToNull(parsed.telefone) : undefined,
        cpf: parsed.cpf !== undefined ? emptyToNull(parsed.cpf) : undefined,
        endereco: parsed.endereco !== undefined ? emptyToNull(parsed.endereco) : undefined,
      },
    });
  }

  async deletarVendedor(id: string) {
    return prisma.vendedor.delete({ where: { id } });
  }

  async listarVeiculos() {
    return prisma.veiculoEntrega.findMany({ orderBy: { placa: "asc" } });
  }

  async criarVeiculo(data: VeiculoInput) {
    const parsed = veiculoSchema.parse(data);
    return prisma.veiculoEntrega.create({
      data: {
        placa: parsed.placa.trim().toUpperCase(),
        modelo: parsed.modelo.trim(),
        ano: parsed.ano ?? null,
        marca: emptyToNull(parsed.marca),
        cor: emptyToNull(parsed.cor),
        capacidade: parsed.capacidade ?? null,
        ativo: parsed.ativo ?? true,
      },
    });
  }

  async atualizarVeiculo(id: string, data: Partial<VeiculoInput>) {
    const parsed = veiculoSchema.partial().parse(data);
    return prisma.veiculoEntrega.update({
      where: { id },
      data: {
        ...parsed,
        placa: parsed.placa !== undefined ? parsed.placa.trim().toUpperCase() : undefined,
        modelo: parsed.modelo !== undefined ? parsed.modelo.trim() : undefined,
        marca: parsed.marca !== undefined ? emptyToNull(parsed.marca) : undefined,
        cor: parsed.cor !== undefined ? emptyToNull(parsed.cor) : undefined,
      },
    });
  }

  async deletarVeiculo(id: string) {
    return prisma.veiculoEntrega.delete({ where: { id } });
  }

  async listarEntregadores() {
    return prisma.entregador.findMany({
      include: { veiculo: true },
      orderBy: { nome: "asc" },
    });
  }

  async criarEntregador(data: EntregadorInput) {
    const parsed = entregadorSchema.parse(data);
    return prisma.entregador.create({
      data: {
        nome: parsed.nome.trim(),
        email: emptyToNull(parsed.email),
        telefone: emptyToNull(parsed.telefone),
        cpf: emptyToNull(parsed.cpf),
        endereco: emptyToNull(parsed.endereco),
        veiculoId: emptyToNull(parsed.veiculoId),
        ativo: parsed.ativo ?? true,
      },
      include: { veiculo: true },
    });
  }

  async atualizarEntregador(id: string, data: Partial<EntregadorInput>) {
    const parsed = entregadorSchema.partial().parse(data);
    return prisma.entregador.update({
      where: { id },
      data: {
        ...parsed,
        email: parsed.email !== undefined ? emptyToNull(parsed.email) : undefined,
        telefone: parsed.telefone !== undefined ? emptyToNull(parsed.telefone) : undefined,
        cpf: parsed.cpf !== undefined ? emptyToNull(parsed.cpf) : undefined,
        endereco: parsed.endereco !== undefined ? emptyToNull(parsed.endereco) : undefined,
        veiculoId: parsed.veiculoId !== undefined ? emptyToNull(parsed.veiculoId) : undefined,
      },
      include: { veiculo: true },
    });
  }

  async deletarEntregador(id: string) {
    return prisma.entregador.delete({ where: { id } });
  }
}
