import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { ProdutoInput, produtoSchema } from "../schemas/produto.schema";
import produtoService from "../services/produto.service";

class ProdutoController {
    /**
     * Cria um novo produto para o usuário autenticado.
     * Valida os dados de entrada com o schema e delega a criação ao service.
     */
    async criar(req: AuthRequest, res: Response) {
        try {
            const dadosValidados = produtoSchema.safeParse(req.body);

            if (!dadosValidados.success) {
                return res.status(400).json(dadosValidados.error.format());
            }

            const userId = req.userId!;

            const produto = await produtoService.criar(
                dadosValidados.data as ProdutoInput,
                userId
            );

            return res.status(201).json(produto);

        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * Lista produtos com paginação, filtro por marca e controle de acesso.
     * Usuários comuns veem apenas seus próprios produtos; admins veem todos.
     */
    async listar(req: AuthRequest, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const marca = req.query.marca as string | undefined;

            const userId = req.userId!;
            const role = req.role!; // 🔥 CORRETO

            const produtos = await produtoService.listar(
                userId,
                role,
                page,
                limit,
                marca
            );

            return res.json(produtos);

        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * Busca um produto por ID e aplica as regras de autorização.
     * Usuários comuns só podem acessar produtos próprios.
     */
    async buscarPorId(req: AuthRequest, res: Response) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            const userId = req.userId!;
            const role = req.role!;

            const produto = await produtoService.buscarPorId(id, userId, role);

            if (!produto) {
                return res.status(404).json({ message: "Produto não encontrado" });
            }

            return res.json(produto);

        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * Atualiza dados de produto, removendo campos proibidos como usuarioId.
     * Apenas o dono do produto ou admin pode realizar a atualização.
     */
    async atualizar(req: AuthRequest, res: Response) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            const userId = req.userId!;
            const role = req.role!;

            const produto = await produtoService.atualizar(
                id,
                req.body,
                userId,
                role
            );

            if (!produto) {
                return res.status(404).json({ message: "Produto não encontrado" });
            }

            return res.json(produto);

        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * Deleta um produto existente quando o usuário tem permissão.
     * Devolve 204 quando a exclusão foi bem sucedida.
     */
    async deletar(req: AuthRequest, res: Response) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            const userId = req.userId!;
            const role = req.role!;

            const deletado = await produtoService.deletar(id, userId, role);

            if (!deletado) {
                return res.status(404).json({ message: "Produto não encontrado" });
            }

            return res.status(204).send();

        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // =========================
    // 📊 DASHBOARD ADMIN
    // =========================
    /**
     * Retorna dados de dashboard apenas para administradores.
     * Inclui métricas gerais do sistema de produtos e usuários.
     */
    async dashboard(req: AuthRequest, res: Response) {
        try {
            const role = req.role;

            if (role !== "admin") {
                return res.status(403).json({ error: "Acesso negado" });
            }

            const data = await produtoService.dashboard();

            return res.json(data);

        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}

export default new ProdutoController();