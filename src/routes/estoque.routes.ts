import { Router } from "express";
import estoqueController from "../controllers/estoque.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

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
router.post("/compras/notas-fiscais/recebimento", estoqueController.receberNotaFiscalCompra);

router.post("/inventarios", estoqueController.abrirInventario);

export default router;
