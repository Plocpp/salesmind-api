import { randomUUID } from "crypto";
import prisma from "../database/prisma";
import { Produto } from "../models/Produto";
import produtoRepository from "../repositories/produto.repository";

class ProdutoService {

    async criar(data: Omit<Produto, "id">) {

        const novoProduto: Produto = {
        id: randomUUID(),
        ...data
        };

        return await produtoRepository.criar(novoProduto);
    }

    async listar(page: number = 1, limit: number = 10, marca?: string) {

    const skip = (page - 1) * limit;

    const produtos = await prisma.produto.findMany({
        where: {
            marca: marca
        },
        skip: skip,
        take: limit
    });

    return produtos;
}

    async buscarPorId(id: string) {
        return await produtoRepository.buscarPorId(id);
    }

    async atualizar(id: string, data: Partial<Produto>) {
        return await produtoRepository.atualizar(id, data);
    }

    async deletar(id: string) {
        return await produtoRepository.deletar(id);
    }
}

export default new ProdutoService();