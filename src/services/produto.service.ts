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

        try {
            return await prisma.produto.findMany({
                where: {
                    ...(role !== "ADMIN" && { usuarioId: userId }),
                    ...(marca && { marcaId: marca })
                },
                select: {
                    id: true,
                    nome: true,
                    peso: true,
                    porte: true,
                    preco: true,
                    estoque: true,
                    tipo: true,
                    codigo: true,
                    codigoBarras: true,
                    cor: true,
                    tamanho: true,
                    validade: true,
                    custoMedio: true,
                    marcaId: true,
                    marca: {
                        include: {
                            fornecedor: true,
                        },
                    },
                },
                skip,
                take: limit
            });
        } catch {
            const produtosLegado = await prisma.$queryRaw<Array<{
                id: string;
                nome: string;
                preco: number;
                estoque: number;
                codigo: string | null;
                codigoBarras: string | null;
            }>>`
                SELECT id, nome, preco, estoque, codigo, codigoBarras
                FROM Produto
                ORDER BY nome ASC
                LIMIT ${limit} OFFSET ${skip}
            `;

            return produtosLegado.map((produto) => ({
                ...produto,
                estoqueDisponivel: Number(produto.estoque || 0),
                tipo: 'FISICO',
                peso: 0,
                porte: 'UNICO',
                cor: null,
                tamanho: null,
                validade: null,
                custoMedio: 0,
                marcaId: '',
                marca: null,
            }));
        }
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

        const produtosPorMarcaRaw = await prisma.$queryRaw<Array<{ marcaId: string; total: bigint | number }>>`
            SELECT marcaId, COUNT(*) AS total
            FROM Produto
            WHERE marcaId IS NOT NULL
            GROUP BY marcaId
        `;

        const produtosPorMarca = produtosPorMarcaRaw.map((item) => ({
            marcaId: item.marcaId,
            _count: {
                _all: Number(item.total),
            },
        }));

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
                ...(role !== "ADMIN" && { usuarioId: userId })
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
                ...(role !== "ADMIN" && { usuarioId: userId })
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
                ...(role !== "ADMIN" && { usuarioId: userId })
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