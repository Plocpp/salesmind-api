// 🛒 VENDAS - Rotas
import { Router } from 'express';
import { VendasController } from '../controllers/vendas.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { authorizeRole } from '../middlewares/role.middleware';

const router = Router();
const vendasController = new VendasController();

// 👤 CLIENTES
router.post('/clientes', authMiddleware, vendasController.criarCliente);
router.get('/clientes/buscar', authMiddleware, vendasController.buscarCliente);

// 📦 PRODUTOS
router.get('/produtos/buscar', authMiddleware, vendasController.buscarProduto);

// 🛒 VENDAS
router.post('/vendas', authMiddleware, vendasController.criarVenda);
router.get('/vendas', authMiddleware, vendasController.listarVendas);

// 📊 DASHBOARD
router.get('/dashboard/vendas', authMiddleware, authorizeRole('ADMIN'), vendasController.dashboardVendas);

export default router;