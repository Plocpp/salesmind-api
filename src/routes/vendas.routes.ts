import { Router } from 'express';
import { VendasController } from '../controllers/vendas.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const vendasController = new VendasController();

router.post('/clientes', authMiddleware, vendasController.criarCliente);
router.get('/clientes/buscar', authMiddleware, vendasController.buscarCliente);
router.get('/clientes/ranking', authMiddleware, vendasController.rankingClientes);
router.get('/clientes/saldos', authMiddleware, vendasController.saldoClientes);

router.get('/produtos/buscar', authMiddleware, vendasController.buscarProduto);

router.post('/vendas', authMiddleware, vendasController.criarVenda);
router.get('/vendas', authMiddleware, vendasController.listarVendas);
router.get('/dashboard', authMiddleware, vendasController.dashboardVendas);

router.post('/caixas', authMiddleware, vendasController.abrirCaixa);
router.get('/caixas', authMiddleware, vendasController.listarCaixas);
router.post('/caixas/movimentos', authMiddleware, vendasController.movimentoCaixa);
router.get('/movimentos-caixa', authMiddleware, vendasController.listarMovimentosCaixa);

router.post('/listas-preco', authMiddleware, vendasController.criarListaPreco);
router.get('/listas-preco', authMiddleware, vendasController.listarListasPreco);

router.post('/orcamentos', authMiddleware, vendasController.criarOrcamento);
router.get('/orcamentos', authMiddleware, vendasController.listarOrcamentos);

router.get('/formas-recebimento', authMiddleware, vendasController.listarFormasRecebimento);
router.get('/modelo-demonstrativo', authMiddleware, vendasController.modeloDemonstrativo);

router.get('/configuracao', authMiddleware, vendasController.obterConfiguracao);
router.put('/configuracao', authMiddleware, vendasController.salvarConfiguracao);

export default router;
