// 🛒 VENDAS - Controlador
import { Request, Response } from 'express';
import { VendasService } from '../services/vendas.service';

const vendasService = new VendasService();

export class VendasController {

  // 👤 CRIAR CLIENTE
  async criarCliente(req: Request, res: Response) {
    try {
      const cliente = await vendasService.criarCliente(req.body);
      res.status(201).json(cliente);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // 🔍 BUSCAR CLIENTE
  async buscarCliente(req: Request, res: Response) {
    try {
      const { telefone, email } = req.query;
      const cliente = await vendasService.buscarCliente(
        telefone as string,
        email as string
      );
      res.json(cliente);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // 📦 BUSCAR PRODUTO
  async buscarProduto(req: Request, res: Response) {
    try {
      const { nome, codigo, codigoBarras } = req.query;
      const produto = await vendasService.buscarProduto({
        nome: nome as string,
        codigo: codigo as string,
        codigoBarras: codigoBarras as string,
      });
      res.json(produto);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // 🛒 CRIAR VENDA
  async criarVenda(req: Request, res: Response) {
    try {
      // @ts-ignore - usuário adicionado pelo middleware
      const usuarioId = req.usuario.id;
      const venda = await vendasService.criarVenda(req.body, usuarioId);
      res.status(201).json(venda);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // 📊 LISTAR VENDAS
  async listarVendas(req: Request, res: Response) {
    try {
      // @ts-ignore - usuário adicionado pelo middleware
      const usuarioId = req.usuario?.id;
      const vendas = await vendasService.listarVendas(usuarioId);
      res.json(vendas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 📈 DASHBOARD VENDAS
  async dashboardVendas(req: Request, res: Response) {
    try {
      const dashboard = await vendasService.dashboardVendas();
      res.json(dashboard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}