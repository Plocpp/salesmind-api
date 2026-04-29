import { Router } from "express";
import produtoController from "../controllers/produto.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorizeRole } from "../middlewares/role.middleware";



const router = Router();

router.post("/", authMiddleware, produtoController.criar);
router.get("/", authMiddleware, produtoController.listar);
router.get("/admin/dashboard", authMiddleware, authorizeRole('ADMIN'), produtoController.dashboard);
router.get("/:id", authMiddleware, produtoController.buscarPorId);
router.put("/:id", authMiddleware, produtoController.atualizar);
router.delete("/:id", authMiddleware, produtoController.deletar);

export default router;