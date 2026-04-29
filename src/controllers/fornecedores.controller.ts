// 🏭 FORNECEDORES E MARCAS - Controlador
import { Request, Response } from 'express';
import { FornecedoresMarcasService } from '../services/fornecedores.service';

const fornecedoresService = new FornecedoresMarcasService();

export class FornecedoresController {

  // 🏭 FORNECEDORES

  // Criar fornecedor
  async criarFornecedor(req: Request, res: Response) {
    try {
      const fornecedor = await fornecedoresService.criarFornecedor(req.body);
      res.status(201).json(fornecedor);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Listar fornecedores
  async listarFornecedores(req: Request, res: Response) {
    try {
      const fornecedores = await fornecedoresService.listarFornecedores();
      res.json(fornecedores);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Buscar fornecedor por ID
  async buscarFornecedorPorId(req: Request, res: Response) {
    try {
      const fornecedor = await fornecedoresService.buscarFornecedorPorId(req.params.id);
      if (!fornecedor) {
        return res.status(404).json({ error: 'Fornecedor não encontrado' });
      }
      res.json(fornecedor);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Atualizar fornecedor
  async atualizarFornecedor(req: Request, res: Response) {
    try {
      const fornecedor = await fornecedoresService.atualizarFornecedor(req.params.id, req.body);
      res.json(fornecedor);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Deletar fornecedor
  async deletarFornecedor(req: Request, res: Response) {
    try {
      await fornecedoresService.deletarFornecedor(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // 🏷️ MARCAS

  // Criar marca
  async criarMarca(req: Request, res: Response) {
    try {
      const marca = await fornecedoresService.criarMarca(req.body);
      res.status(201).json(marca);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Listar marcas
  async listarMarcas(req: Request, res: Response) {
    try {
      const marcas = await fornecedoresService.listarMarcas();
      res.json(marcas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Buscar marca por ID
  async buscarMarcaPorId(req: Request, res: Response) {
    try {
      const marca = await fornecedoresService.buscarMarcaPorId(req.params.id);
      if (!marca) {
        return res.status(404).json({ error: 'Marca não encontrada' });
      }
      res.json(marca);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Atualizar marca
  async atualizarMarca(req: Request, res: Response) {
    try {
      const marca = await fornecedoresService.atualizarMarca(req.params.id, req.body);
      res.json(marca);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Deletar marca
  async deletarMarca(req: Request, res: Response) {
    try {
      await fornecedoresService.deletarMarca(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // 📦 PRODUTOS

  // Criar produto
  async criarProduto(req: Request, res: Response) {
    try {
      const produto = await fornecedoresService.criarProduto({
        ...req.body,
        usuarioId: (req as any).usuario?.id,
      });
      res.status(201).json(produto);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Listar produtos
  async listarProdutos(req: Request, res: Response) {
    try {
      const produtos = await fornecedoresService.listarProdutos();
      res.json(produtos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Buscar produto por ID
  async buscarProdutoPorId(req: Request, res: Response) {
    try {
      const produto = await fornecedoresService.buscarProdutoPorId(req.params.id);
      if (!produto) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }
      res.json(produto);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Atualizar produto
  async atualizarProduto(req: Request, res: Response) {
    try {
      const produto = await fornecedoresService.atualizarProduto(req.params.id, req.body);
      res.json(produto);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Deletar produto
  async deletarProduto(req: Request, res: Response) {
    try {
      await fornecedoresService.deletarProduto(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // 📊 DASHBOARD
  async dashboardFornecedores(req: Request, res: Response) {
    try {
      const dashboard = await fornecedoresService.dashboardFornecedores();
      res.json(dashboard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}