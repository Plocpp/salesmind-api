import { Prisma } from "@prisma/client";
import prisma from "../database/prisma";

class ProdutoRepository {
    /**
     * Persiste um novo produto no banco de dados.
     */
    async criar(data: Prisma.ProdutoCreateInput) {
        return prisma.produto.create({
            data
        });
    }

    /**
     * Retorna todos os produtos armazenados.
     * Esta camada não aplica regras de autorização.
     */
    async listar() {
        return prisma.produto.findMany();
    }

    /**
     * Busca um produto pelo seu identificador único.
     */
    async buscarPorId(id: string) {
        return prisma.produto.findUnique({
            where: { id }
        });
    }

    /**
     * Atualiza um produto existente no banco.
     */
    async atualizar(id: string, data: Prisma.ProdutoUpdateInput) {
        return prisma.produto.update({
            where: { id },
            data
        });
    }

    /**
     * Remove um produto pelo seu identificador.
     */
    async deletar(id: string) {
        return prisma.produto.delete({
            where: { id }
        });
    }
}

export default new ProdutoRepository();