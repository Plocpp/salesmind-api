import crypto from "crypto";
import { z } from "zod";
import prisma from "../database/prisma";

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
  private entregadorTableName: string | null | undefined = undefined;

  private async ensureEntregadorTable() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS entregador (
        id VARCHAR(191) PRIMARY KEY,
        nome VARCHAR(191) NOT NULL,
        email VARCHAR(191) NULL,
        telefone VARCHAR(60) NULL,
        cpf VARCHAR(60) NULL,
        endereco TEXT NULL,
        veiculoId VARCHAR(191) NULL,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_entregador_nome (nome),
        INDEX idx_entregador_email (email),
        INDEX idx_entregador_ativo (ativo)
      )
    `);

    this.entregadorTableName = "entregador";
    return this.entregadorTableName;
  }

  private async resolveEntregadorTableName() {
    if (this.entregadorTableName !== undefined) return this.entregadorTableName;

    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) IN ('entregador', 'entregadores')
      ORDER BY CASE
        WHEN LOWER(table_name) = 'entregador' THEN 0
        WHEN LOWER(table_name) = 'entregadores' THEN 1
        ELSE 2
      END
      LIMIT 1
      `,
    );

    const tableName = rows[0]?.table_name ? String(rows[0].table_name) : null;
    this.entregadorTableName = /^[a-zA-Z0-9_]+$/.test(tableName || "") ? tableName : null;

    if (!this.entregadorTableName) {
      return this.ensureEntregadorTable();
    }

    return this.entregadorTableName;
  }

  private async getTableColumns(tableName: string) {
    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
      `,
      tableName,
    );

    const columns = new Set<string>();
    rows.forEach((row) => {
      const name = String(row.column_name || "").trim();
      if (!name) return;
      columns.add(name);
      columns.add(name.toLowerCase());
    });
    return columns;
  }

  private pickColumn(columns: Set<string>, candidates: string[]) {
    return candidates.find((item) => columns.has(item)) || null;
  }

  private async pickExistingColumn(tableName: string, candidates: string[]) {
    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
      `,
      tableName,
    );

    const byLower = new Map<string, string>();
    rows.forEach((row) => {
      const name = String(row.column_name || "").trim();
      if (!name) return;
      byLower.set(name.toLowerCase(), name);
    });

    for (const candidate of candidates) {
      const resolved = byLower.get(candidate.toLowerCase());
      if (resolved) return resolved;
    }

    return null;
  }

  async listarVendedores() {
    return (prisma as any).vendedor.findMany({ orderBy: { nome: "asc" } });
  }

  async criarVendedor(data: VendedorInput) {
    const parsed = vendedorSchema.parse(data);
    return (prisma as any).vendedor.create({
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
    return (prisma as any).vendedor.update({
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
    return (prisma as any).vendedor.delete({ where: { id } });
  }

  async listarVeiculos() {
    return (prisma as any).veiculoEntrega.findMany({ orderBy: { placa: "asc" } });
  }

  async criarVeiculo(data: VeiculoInput) {
    const parsed = veiculoSchema.parse(data);
    return (prisma as any).veiculoEntrega.create({
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
    return (prisma as any).veiculoEntrega.update({
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
    return (prisma as any).veiculoEntrega.delete({ where: { id } });
  }

  async listarEntregadores() {
    const delegate = (prisma as any).entregador;
    if (delegate?.findMany) {
      return delegate.findMany({
        include: { veiculo: true },
        orderBy: { nome: "asc" },
      });
    }

    const table = await this.resolveEntregadorTableName();
    if (!table) return [];

    const columns = await this.getTableColumns(table);
    const veiculoCol = this.pickColumn(columns, ["veiculoId", "veiculo_id"]);

    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT id, nome, email, telefone, cpf, endereco, ${veiculoCol || "NULL"} AS veiculo_id, ativo
      FROM ${table}
      ORDER BY nome ASC
      LIMIT 500
      `,
    );

    return rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      email: row.email,
      telefone: row.telefone,
      cpf: row.cpf,
      endereco: row.endereco,
      veiculoId: row.veiculo_id || null,
      ativo: Boolean(row.ativo),
      veiculo: null,
    }));
  }

  async criarEntregador(data: EntregadorInput) {
    const parsed = entregadorSchema.parse(data);
    const delegate = (prisma as any).entregador;
    if (delegate?.create) {
      return delegate.create({
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

    const table = await this.resolveEntregadorTableName();
    if (!table) throw new Error("tabela_entregador_nao_encontrada");

    const idCol = await this.pickExistingColumn(table, ["id"]);
    const nomeCol = await this.pickExistingColumn(table, ["nome"]);
    const emailCol = await this.pickExistingColumn(table, ["email"]);
    const telefoneCol = await this.pickExistingColumn(table, ["telefone"]);
    const cpfCol = await this.pickExistingColumn(table, ["cpf"]);
    const enderecoCol = await this.pickExistingColumn(table, ["endereco"]);
    const ativoCol = await this.pickExistingColumn(table, ["ativo"]);
    const veiculoCol = await this.pickExistingColumn(table, ["veiculoId", "veiculo_id"]);

    if (!idCol || !nomeCol) {
      throw new Error("colunas_entregador_invalidas");
    }

    const id = crypto.randomUUID();
    const fieldValuePairs: Array<{ field: string; value: any }> = [
      { field: idCol, value: id },
      { field: nomeCol, value: parsed.nome.trim() },
    ];

    if (emailCol) fieldValuePairs.push({ field: emailCol, value: emptyToNull(parsed.email) });
    if (telefoneCol) fieldValuePairs.push({ field: telefoneCol, value: emptyToNull(parsed.telefone) });
    if (cpfCol) fieldValuePairs.push({ field: cpfCol, value: emptyToNull(parsed.cpf) });
    if (enderecoCol) fieldValuePairs.push({ field: enderecoCol, value: emptyToNull(parsed.endereco) });
    if (ativoCol) fieldValuePairs.push({ field: ativoCol, value: parsed.ativo ?? true });
    if (veiculoCol) fieldValuePairs.push({ field: veiculoCol, value: emptyToNull(parsed.veiculoId) });

    const fields = fieldValuePairs.map((item) => item.field);
    const placeholders = fields.map(() => "?").join(", ");
    const values = fieldValuePairs.map((item) => item.value);

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO ${table} (${fields.join(", ")})
      VALUES (${placeholders})
      `,
      ...values,
    );

    return {
      id,
      nome: parsed.nome.trim(),
      email: emptyToNull(parsed.email),
      telefone: emptyToNull(parsed.telefone),
      cpf: emptyToNull(parsed.cpf),
      endereco: emptyToNull(parsed.endereco),
      veiculoId: veiculoCol ? emptyToNull(parsed.veiculoId) : null,
      ativo: Boolean(parsed.ativo ?? true),
      veiculo: null,
    };
  }

  async atualizarEntregador(id: string, data: Partial<EntregadorInput>) {
    const parsed = entregadorSchema.partial().parse(data);
    return (prisma as any).entregador.update({
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
    return (prisma as any).entregador.delete({ where: { id } });
  }
}
