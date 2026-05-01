import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { VendasService } from "../services/vendas.service";

const vendasService = new VendasService();

    // 🔥 util
    const requireUser = (req: AuthRequest) => {
    if (!req.userId) throw new Error("Usuário não autenticado");
    return req.userId;
    };

    export class VendasController {

    // =========================
    // 👤 CLIENTE
    // =========================

    async criarCliente(req: AuthRequest, res: Response) {
        const cliente = await vendasService.criarCliente(req.body);
        return res.status(201).json(cliente);
    }

    async buscarCliente(req: AuthRequest, res: Response) {
        const { nome, telefone, email } = req.query;

        const cliente = await vendasService.buscarCliente(
            nome as string,
            telefone as string,
            email as string
        );

        return res.json(cliente);
    }

    // =========================
    // 📦 PRODUTO
    // =========================

    async buscarProduto(req: AuthRequest, res: Response) {
        const { nome, codigo, codigoBarras } = req.query;

        const produto = await vendasService.buscarProduto({
        nome: nome as string,
        codigo: codigo as string,
        codigoBarras: codigoBarras as string,
        });

        return res.json(produto);
    }

    // =========================
    // 🛒 VENDA
    // =========================

    async criarVenda(req: AuthRequest, res: Response) {
        const userId = requireUser(req);

        const venda = await vendasService.criarVenda(req.body, userId);

        return res.status(201).json(venda);
    }

    async listarVendas(req: AuthRequest, res: Response) {
        const userId = requireUser(req);

        const vendas = await vendasService.listarVendas(userId);

        return res.json(vendas);
    }

    // =========================
    // 📊 DASHBOARD
    // =========================

    async dashboardVendas(req: AuthRequest, res: Response) {
        const dashboard = await vendasService.dashboardVendas();
        return res.json(dashboard);
    }
}