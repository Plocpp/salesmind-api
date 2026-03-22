import { Request, Response } from "express";
import { produtoSchema } from "../schemas/produto.schema";
import produtoService from "../services/produto.service";

class ProdutoController {

    async criar(req: Request, res: Response) {
        const dadosValidados = produtoSchema.safeParse(req.body);

        if (!dadosValidados.success) {
        return res.status(400).json(dadosValidados.error.format());
        }

        const produto = await produtoService.criar(dadosValidados.data);
        return res.status(201).json(produto);
    }

    async listar(req: Request, res: Response) {

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const marca = req.query.marca as string | undefined;

    const produtos = await produtoService.listar(page, limit, marca);

    return res.json(produtos);
}

    async buscarPorId(req: Request<{ id: string }>, res: Response) {
        const { id } = req.params;

        const produto = await produtoService.buscarPorId(id);

        if (!produto) {
        return res.status(404).json({ message: "Produto não encontrado" });
        }

        return res.json(produto);
    }

    async atualizar(req: Request<{ id: string }>, res: Response) {
        const { id } = req.params;

        const produto = await produtoService.atualizar(id, req.body);

        if (!produto) {
        return res.status(404).json({ message: "Produto não encontrado" });
        }

        return res.json(produto);
    }

    async deletar(req: Request<{ id: string }>, res: Response) {
        const { id } = req.params;

        const deletado = await produtoService.deletar(id);

        if (!deletado) {
        return res.status(404).json({ message: "Produto não encontrado" });
        }

        return res.status(204).send();
    }
    }

export default new ProdutoController();
