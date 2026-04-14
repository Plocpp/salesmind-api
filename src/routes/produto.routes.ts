import { Router } from "express";
import produtoController from "../controllers/produto.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", produtoController.criar);
router.get("/", produtoController.listar);
router.get("/:id", produtoController.buscarPorId);
router.put("/:id", produtoController.atualizar);
router.delete("/:id", produtoController.deletar);

router.get("/", authMiddleware, produtoController.listar);
router.post("/", authMiddleware, produtoController.criar);

export default router;