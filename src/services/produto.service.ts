import { Prisma } from "@prisma/client";
import prisma from "../database/prisma";

/**
 * 📦 ProdutoService
 * Responsável por TODA a lógica de negócio relacionada a produtos
 */
class ProdutoService {

    // =========================
    // 📌 CRIAR PRODUTO
    // =========================
    /**
     * Cria um novo produto vinculado ao usuário autenticado
     * 
     * 🔐 Regra de segurança:
     * - usuarioId NÃO vem do frontend
     * - usuarioId vem do token (userId)
     */
    async criar(
        data: Omit<Prisma.ProdutoUncheckedCreateInput, "id" | "usuarioId">,
        userId: string
    ) {
        return await prisma.produto.create({
            data: {
                ...data,
                usuarioId: userId
            },
            include: {
                marca: {
                    include: {
                        fornecedor: true,
                    },
                },
            },
        });
    }

    // =========================
    // 📋 LISTAR PRODUTOS
    // =========================
    /**
     * Lista produtos com controle de acesso por role
     * 
     * 👤 user:
     * - vê apenas seus produtos
     * 
     * 👑 admin:
     * - vê todos os produtos
     */
    async listar(
        userId: string,
        role: string,
        page: number = 1,
        limit: number = 10,
        marca?: string
    ) {
        const skip = (page - 1) * limit;

        return await prisma.produto.findMany({
            where: {
                ...(role !== "admin" && { usuarioId: userId }),
                ...(marca && { marcaId: marca })
            },
            include: {
                marca: {
                    include: {
                        fornecedor: true,
                    },
                },
            },
            skip,
            take: limit
        });
    }

    // =========================
    // 📊 DASHBOARD ADMIN
    // =========================
    /**
     * Retorna métricas gerais do sistema
     * 
     * 📦 Produtos:
     * - total de produtos
     * - produtos com estoque baixo
     * - agrupamento por marca
     * 
     * 👥 Usuários:
     * - total de usuários cadastrados
     */
    async dashboard() {
        const totalProdutos = await prisma.produto.count();
        const totalUsuarios = await prisma.usuario.count();
        const totalEstoqueResult = await prisma.produto.aggregate({
            _sum: {
                estoque: true
            }
        });
        const totalEstoque = totalEstoqueResult._sum.estoque ?? 0;

        const produtosEstoqueBaixo = await prisma.produto.findMany({
            where: {
                estoque: {
                    lt: 5
                }
            },
            orderBy: {
                estoque: 'asc'
            },
            take: 5,
            select: {
                id: true,
                nome: true,
                estoque: true,
            }
        });

        const produtosPorMarca = await prisma.produto.groupBy({
            by: ["marcaId"],
            _count: {
                _all: true
            }
        });

        return {
            totalUsuarios,
            totalProdutos,
            totalEstoque,
            produtosEstoqueBaixo,
            produtosPorMarca
        };
    }

    // =========================
    // �🔍 BUSCAR POR ID
    // =========================
    /**
     * Busca um produto específico
     * 
     * 🔐 Regra:
     * - user só acessa se for dono
     * - admin acessa qualquer produto
     */
    async buscarPorId(
        id: string,
        userId: string,
        role: string
    ) {
        return await prisma.produto.findFirst({
            where: {
                id,
                ...(role !== "admin" && { usuarioId: userId })
            },
            include: {
                marca: {
                    include: {
                        fornecedor: true,
                    },
                },
            },
        });
    }

    // =========================
    // ✏️ ATUALIZAR PRODUTO
    // =========================
    /**
     * Atualiza um produto
     * 
     * 🔐 Regra:
     * - só dono ou admin pode atualizar
     * - evita alteração de usuarioId
     */
    async atualizar(
        id: string,
        data: Prisma.ProdutoUncheckedUpdateInput,
        userId: string,
        role: string
    ) {

        const produto = await prisma.produto.findFirst({
            where: {
                id,
                ...(role !== "admin" && { usuarioId: userId })
            }
        });

        if (!produto) return null;

        // 🔥 proteção contra alteração indevida
        const { usuarioId, id: _, ...dadosAtualizar } = data;

        return await prisma.produto.update({
            where: { id },
            data: dadosAtualizar,
            include: {
                marca: {
                    include: {
                        fornecedor: true,
                    },
                },
            },
        });
    }

    // =========================
    // 🗑️ DELETAR PRODUTO
    // =========================
    /**
     * Remove um produto
     * 
     * 🔐 Regra:
     * - apenas dono ou admin pode deletar
     */
    async deletar(
        id: string,
        userId: string,
        role: string
    ) {

        const produto = await prisma.produto.findFirst({
            where: {
                id,
                ...(role !== "admin" && { usuarioId: userId })
            }
        });

        if (!produto) return null;

        await prisma.produto.delete({
            where: { id }
        });

        return true;
    }
}

export default new ProdutoService();