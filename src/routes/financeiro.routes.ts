import { Router } from "express";
import financeiroController from "../controllers/financeiro.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/lancamentos", financeiroController.criarLancamento);
router.get("/lancamentos", financeiroController.listarLancamentos);
router.post("/lancamentos/:id/baixa", financeiroController.baixarLancamento);

router.post("/contas", financeiroController.criarConta);
router.get("/contas", financeiroController.listarContas);

router.post("/categorias", financeiroController.criarCategoria);
router.get("/categorias", financeiroController.listarCategorias);

router.post("/formas-pagamento", financeiroController.criarFormaPagamento);
router.get("/formas-pagamento", financeiroController.listarFormasPagamento);

router.post("/conciliacoes/cartoes", financeiroController.conciliarCartao);

router.get("/demonstrativo", financeiroController.demonstrativo);
router.get("/fluxo-caixa", financeiroController.fluxoCaixa);

export default router;
