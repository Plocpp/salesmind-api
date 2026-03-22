import { Router } from "express";
import produtoController from "../controllers/produto.controller";

const router = Router();

router.post("/", produtoController.criar);
router.get("/", produtoController.listar);
router.get("/:id", produtoController.buscarPorId);
router.put("/:id", produtoController.atualizar);
router.delete("/:id", produtoController.deletar);

export default router;