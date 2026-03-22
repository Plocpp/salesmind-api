import prisma from "../database/prisma";
import { Produto } from "../models/Produto";

class ProdutoRepository {

    async criar(data: Produto) {
        return prisma.produto.create({
        data
        });
    }

    async listar() {
        return prisma.produto.findMany();
    }

    async buscarPorId(id: string) {
        return prisma.produto.findUnique({
        where: { id }
        });
    }

    async atualizar(id: string, data: Partial<Produto>) {
        return prisma.produto.update({
        where: { id },
        data
        });
    }

    async deletar(id: string) {
        return prisma.produto.delete({
        where: { id }
        });
    }
    }

export default new ProdutoRepository();