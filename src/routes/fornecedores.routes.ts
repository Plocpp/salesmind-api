// 🏭 FORNECEDORES E MARCAS - Rotas
import { Router } from 'express';
import { FornecedoresController } from '../controllers/fornecedores.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { authorizeRole } from '../middlewares/role.middleware';

const router = Router();
const fornecedoresController = new FornecedoresController();

// 🏭 FORNECEDORES
router.post('/fornecedores', authMiddleware, fornecedoresController.criarFornecedor);
router.get('/fornecedores', authMiddleware, fornecedoresController.listarFornecedores);
router.get('/fornecedores/:id', authMiddleware, fornecedoresController.buscarFornecedorPorId);
router.put('/fornecedores/:id', authMiddleware, fornecedoresController.atualizarFornecedor);
router.delete('/fornecedores/:id', authMiddleware, fornecedoresController.deletarFornecedor);

// 🏷️ MARCAS
router.post('/marcas', authMiddleware, fornecedoresController.criarMarca);
router.get('/marcas', authMiddleware, fornecedoresController.listarMarcas);
router.get('/marcas/:id', authMiddleware, fornecedoresController.buscarMarcaPorId);
router.put('/marcas/:id', authMiddleware, fornecedoresController.atualizarMarca);
router.delete('/marcas/:id', authMiddleware, fornecedoresController.deletarMarca);

// 📦 PRODUTOS (atualizados)
router.post('/produtos', authMiddleware, fornecedoresController.criarProduto);
router.get('/produtos', authMiddleware, fornecedoresController.listarProdutos);
router.get('/produtos/:id', authMiddleware, fornecedoresController.buscarProdutoPorId);
router.put('/produtos/:id', authMiddleware, fornecedoresController.atualizarProduto);
router.delete('/produtos/:id', authMiddleware, fornecedoresController.deletarProduto);

// 📊 DASHBOARD
router.get('/dashboard/fornecedores', authMiddleware, authorizeRole('ADMIN'), fornecedoresController.dashboardFornecedores);

export default router;