import prisma from "../database/prisma";
import { Produto } from "../models/Produto";


class ProdutoService {

    // 🔥 Criar produto vinculado ao usuário
    async criar(data: Omit<Produto, "id">, userId: string) {

        const produto = await prisma.produto.create({
            data: {
                ...data,
                usuarioId: userId
            }
        });

        return produto;
    }

    // 🔥 Listar produtos SOMENTE do usuário
    async listar(
        userId: string,
        page: number = 1,
        limit: number = 10,
        marca?: string
    ) {

        const skip = (page - 1) * limit;

        const produtos = await prisma.produto.findMany({
            where: {
                usuarioId: userId,
                ...(marca && { marca })
            },
            skip,
            take: limit
        });

        return produtos;
    }

    // 🔥 Buscar produto por ID (somente se for do usuário)
    async buscarPorId(id: string, userId: string) {

        return await prisma.produto.findFirst({
            where: {
                id,
                usuarioId: userId
            }
        });

    }

    // 🔥 Atualizar (somente se for dono)
    async atualizar(id: string, data: Partial<Produto>, userId: string) {

        const produto = await prisma.produto.findFirst({
            where: {
                id,
                usuarioId: userId
            }
        });

        if (!produto) {
            return null;
        }

        return await prisma.produto.update({
            where: { id },
            data
        });

    }

    // 🔥 Deletar (somente se for dono)
    async deletar(id: string, userId: string) {

        const produto = await prisma.produto.findFirst({
            where: {
                id,
                usuarioId: userId
            }
        });

        if (!produto) {
            return null;
        }

        await prisma.produto.delete({
            where: { id }
        });

        return true;
    }
}

export default new ProdutoService();