import { Router } from "express";
import estoqueController from "../controllers/estoque.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/catalogo/itens", estoqueController.listarCatalogoItens);
router.get("/atalhos-operacionais", estoqueController.atalhosOperacionais);
router.post("/catalogo/itens", estoqueController.criarItemCatalogo);
router.patch("/catalogo/itens/:id", estoqueController.atualizarItemCatalogo);
router.get("/catalogo/indicadores-validade", estoqueController.indicadoresValidade);
router.get("/compras/sugestoes", estoqueController.sugestoesCompra);

router.post("/grupos", estoqueController.criarGrupo);
router.get("/grupos", estoqueController.listarGrupos);

router.post("/depositos", estoqueController.criarDeposito);
router.get("/depositos", estoqueController.listarDepositos);

router.post("/movimentacoes", estoqueController.movimentar);
router.post("/reservas", estoqueController.reservar);
router.post("/reservas/liberar", estoqueController.liberarReserva);
router.get("/saldos", estoqueController.listarSaldos);

router.get("/analise", estoqueController.analise);

router.post("/compras/pedidos", estoqueController.criarPedidoCompra);
router.get("/compras/pedidos", estoqueController.listarPedidosCompra);
router.get("/compras/pedidos/:id/auditoria-ia", estoqueController.obterAuditoriaIaPedidoCompra);
router.post("/compras/pedidos/:id/status", estoqueController.cancelarPedidoCompra);
router.post("/compras/notas-fiscais/preview-xml", estoqueController.previewImportacaoNotaFiscalCompraXml);
router.post("/compras/notas-fiscais/importar-xml", estoqueController.importarNotaFiscalCompraXml);
router.post("/compras/notas-fiscais/recebimento", estoqueController.receberNotaFiscalCompra);
router.get("/compras/notas-fiscais", estoqueController.listarNotasFiscaisCompra);

router.post("/inventarios", estoqueController.abrirInventario);

export default router;
