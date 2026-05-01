import { Request, Response } from "express";
import { FornecedoresMarcasService } from "../services/fornecedores.service";
import { asyncHandler } from "../utils/asyncHandler";

const service = new FornecedoresMarcasService();

export class FornecedoresController {

    // =========================
    // 🏭 FORNECEDORES
    // =========================

    criarFornecedor = asyncHandler(async (req: Request, res: Response) => {
        const data = await service.criarFornecedor(req.body);
        res.status(201).json(data);
    });

    listarFornecedores = asyncHandler(async (req: Request, res: Response) => {
        const data = await service.listarFornecedores();
        res.json(data);
    });

    buscarFornecedorPorId = asyncHandler(async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const data = await service.buscarFornecedorPorId(id);

        if (!data) {
        return res.status(404).json({ error: "Fornecedor não encontrado" });
        }

        res.json(data);
    });

    atualizarFornecedor = asyncHandler(async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const data = await service.atualizarFornecedor(id, req.body);
        res.json(data);
    });

    deletarFornecedor = asyncHandler(async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await service.deletarFornecedor(id);
        res.status(204).send();
    });

    // =========================
    // 🏷️ MARCAS
    // =========================

    criarMarca = asyncHandler(async (req: Request, res: Response) => {
        const data = await service.criarMarca(req.body);
        res.status(201).json(data);
    });

    listarMarcas = asyncHandler(async (req: Request, res: Response) => {
        const data = await service.listarMarcas();
        res.json(data);
    });

    buscarMarcaPorId = asyncHandler(async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const data = await service.buscarMarcaPorId(id);

        if (!data) {
        return res.status(404).json({ error: "Marca não encontrada" });
        }

        res.json(data);
    });

    atualizarMarca = asyncHandler(async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const data = await service.atualizarMarca(id, req.body);
        res.json(data);
    });

    deletarMarca = asyncHandler(async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await service.deletarMarca(id);
        res.status(204).send();
    });

    // =========================
    // 📦 PRODUTOS
    // =========================

    criarProduto = asyncHandler(async (req: any, res: Response) => {
        const data = await service.criarProduto({
        ...req.body,
        usuarioId: req.userId // 🔥 agora correto
        });

        res.status(201).json(data);
    });

    listarProdutos = asyncHandler(async (req: Request, res: Response) => {
        const data = await service.listarProdutos();
        res.json(data);
    });

    buscarProdutoPorId = asyncHandler(async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const data = await service.buscarProdutoPorId(id);

        if (!data) {
        return res.status(404).json({ error: "Produto não encontrado" });
        }

        res.json(data);
    });

    atualizarProduto = asyncHandler(async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const data = await service.atualizarProduto(id, req.body);
        res.json(data);
    });

    deletarProduto = asyncHandler(async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await service.deletarProduto(id);
        res.status(204).send();
    });

    // =========================
    // 👥 CLIENTES
    // =========================

    criarCliente = asyncHandler(async (req: Request, res: Response) => {
        const data = await service.criarCliente(req.body);
        res.status(201).json(data);
    });

    listarClientes = asyncHandler(async (req: Request, res: Response) => {
        const data = await service.listarClientes();
        res.json(data);
    });

    buscarClientePorId = asyncHandler(async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const data = await service.buscarClientePorId(id);

        if (!data) {
            return res.status(404).json({ error: "Cliente não encontrado" });
        }

        res.json(data);
    });

    atualizarCliente = asyncHandler(async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const data = await service.atualizarCliente(id, req.body);
        res.json(data);
    });

    deletarCliente = asyncHandler(async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await service.deletarCliente(id);
        res.status(204).send();
    });

    // =========================
    // 📊 DASHBOARD
    // =========================

    dashboardFornecedores = asyncHandler(async (req: Request, res: Response) => {
        const data = await service.dashboardFornecedores();
        res.json(data);
    });
}