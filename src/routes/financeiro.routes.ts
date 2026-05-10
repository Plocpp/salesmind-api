import { Router } from "express";
import { FinanceiroController } from "../controllers/financeiro.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const controller = new FinanceiroController();

router.get("/resumo", authMiddleware, controller.resumo);
router.get("/integracoes", authMiddleware, controller.listarIntegracoes);
router.post("/integracoes", authMiddleware, controller.salvarIntegracao);
router.put("/integracoes/:id", authMiddleware, controller.atualizarIntegracao);
router.get("/empresa", authMiddleware, controller.obterConfiguracaoEmpresa);
router.put("/empresa", authMiddleware, controller.salvarConfiguracaoEmpresa);
router.get("/notas", authMiddleware, controller.listarNotas);
router.post("/notas", authMiddleware, controller.registrarNota);
router.put("/produtos/:id/tributacao", authMiddleware, controller.atualizarTributacaoProduto);

export default router;
