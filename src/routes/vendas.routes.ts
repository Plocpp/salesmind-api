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
router.get('/caixas/:id/resumo', authMiddleware, vendasController.resumoCaixa);
router.post('/caixas/:id/fechar', authMiddleware, vendasController.fecharCaixa);
router.get('/movimentos-caixa', authMiddleware, vendasController.listarMovimentosCaixa);

router.post('/listas-preco', authMiddleware, vendasController.criarListaPreco);
router.get('/listas-preco', authMiddleware, vendasController.listarListasPreco);
router.put('/listas-preco/:id', authMiddleware, vendasController.atualizarListaPreco);
router.delete('/listas-preco/:id', authMiddleware, vendasController.deletarListaPreco);

router.post('/orcamentos', authMiddleware, vendasController.criarOrcamento);
router.get('/orcamentos', authMiddleware, vendasController.listarOrcamentos);
router.post('/orcamentos/:id/converter', authMiddleware, vendasController.converterOrcamentoParaVenda);
router.post('/orcamentos/:id/enviar-email', authMiddleware, vendasController.enviarOrcamentoPorEmail);
router.delete('/orcamentos/:id', authMiddleware, vendasController.deletarOrcamento);

router.post('/formas-recebimento', authMiddleware, vendasController.criarFormaRecebimento);
router.get('/formas-recebimento', authMiddleware, vendasController.listarFormasRecebimento);
router.put('/formas-recebimento/:id', authMiddleware, vendasController.atualizarFormaRecebimento);

router.post('/recebimentos/:id/pagamento', authMiddleware, vendasController.registrarPagamento);
router.post('/vendas/:id/emitir-nfce', authMiddleware, vendasController.emitirNfce);
router.post('/pacotes/:id/renovar', authMiddleware, vendasController.renovarPacote);
router.post('/pacotes/:id/cancelar', authMiddleware, vendasController.cancelarPacote);
router.get('/modelo-demonstrativo', authMiddleware, vendasController.modeloDemonstrativo);

router.get('/configuracao', authMiddleware, vendasController.obterConfiguracao);
router.put('/configuracao', authMiddleware, vendasController.salvarConfiguracao);

export default router;
