import { Response } from "express";
import { ParsedQs } from "qs";
import { AuthRequest } from "../middlewares/auth.middleware";
import { ProdutoInput, produtoSchema } from "../schemas/produto.schema";
import produtoService from "../services/produto.service";

class ProdutoController {
    private normalizeId(value: string | string[] | undefined): string | null {
        if (!value) {
            return null;
        }

        return Array.isArray(value) ? value[0] : value;
    }

    private normalizeString(value: string | string[] | ParsedQs | (string | ParsedQs)[] | undefined): string | undefined {
        if (!value) {
            return undefined;
        }

        if (Array.isArray(value)) {
            return typeof value[0] === "string" ? value[0] : undefined;
        }

        return typeof value === "string" ? value : undefined;
    }

    private normalizeNumber(value: string | string[] | ParsedQs | (string | ParsedQs)[] | undefined, fallback: number): number {
        const normalized = this.normalizeString(value);
        if (!normalized) {
            return fallback;
        }

        const parsed = Number(normalized);
        return Number.isNaN(parsed) ? fallback : parsed;
    }

    private getUserContext(req: AuthRequest) {
        const userId = req.userId;
        if (!userId) {
            throw new Error("Usuário não autenticado");
        }

        return {
            userId,
            role: (req.role ?? "USER").toUpperCase(),
        };
    }

    // =========================
    // 📦 CRIAR
    // =========================
    async criar(req: AuthRequest, res: Response) {
        const resultado = produtoSchema.safeParse(req.body);
        if (!resultado.success) {
            return res.status(400).json(resultado.error.format());
        }

        const { userId } = this.getUserContext(req);
        const produto = await produtoService.criar(resultado.data as ProdutoInput, userId);

        return res.status(201).json(produto);
    }

    // =========================
    // 📋 LISTAR
    // =========================
    async listar(req: AuthRequest, res: Response) {
        const { userId, role } = this.getUserContext(req);
        const page = this.normalizeNumber(req.query.page, 1);
        const limit = this.normalizeNumber(req.query.limit, 10);
        const marca = this.normalizeString(req.query.marca);

        const produtos = await produtoService.listar(userId, role, page, limit, marca);
        return res.json(produtos);
    }

    // =========================
    // 🔍 BUSCAR
    // =========================
    async buscarPorId(req: AuthRequest, res: Response) {
        const { userId, role } = this.getUserContext(req);
        const id = this.normalizeId(req.params.id);

        if (!id) {
            return res.status(400).json({ message: "ID inválido" });
        }

        const produto = await produtoService.buscarPorId(id, userId, role);
        if (!produto) {
            return res.status(404).json({ message: "Produto não encontrado" });
        }

        return res.json(produto);
    }

    // =========================
    // ✏️ ATUALIZAR
    // =========================
    async atualizar(req: AuthRequest, res: Response) {
        const { userId, role } = this.getUserContext(req);
        const id = this.normalizeId(req.params.id);

        if (!id) {
            return res.status(400).json({ message: "ID inválido" });
        }

        const produto = await produtoService.atualizar(id, req.body, userId, role);
        if (!produto) {
            return res.status(404).json({ message: "Produto não encontrado" });
        }

        return res.json(produto);
    }

    // =========================
    // 🗑️ DELETAR
    // =========================
    async deletar(req: AuthRequest, res: Response) {
        const { userId, role } = this.getUserContext(req);
        const id = this.normalizeId(req.params.id);

        if (!id) {
            return res.status(400).json({ message: "ID inválido" });
        }

        const deletado = await produtoService.deletar(id, userId, role);
        if (!deletado) {
            return res.status(404).json({ message: "Produto não encontrado" });
        }

        return res.status(204).send();
    }

    // =========================
    // 📊 DASHBOARD
    // =========================
    async dashboard(req: AuthRequest, res: Response) {
        const { role } = this.getUserContext(req);

        if (role !== "ADMIN") {
            return res.status(403).json({ error: "Acesso negado" });
        }

        const data = await produtoService.dashboard();
        return res.json(data);
    }
}

export default new ProdutoController();
