import { Router } from "express";
import { CadastrosAuxiliaresController } from "../controllers/cadastros-auxiliares.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const controller = new CadastrosAuxiliaresController();

router.get("/vendedores", authMiddleware, controller.listarVendedores);
router.post("/vendedores", authMiddleware, controller.criarVendedor);
router.put("/vendedores/:id", authMiddleware, controller.atualizarVendedor);
router.delete("/vendedores/:id", authMiddleware, controller.deletarVendedor);

router.get("/veiculos-entrega", authMiddleware, controller.listarVeiculos);
router.post("/veiculos-entrega", authMiddleware, controller.criarVeiculo);
router.put("/veiculos-entrega/:id", authMiddleware, controller.atualizarVeiculo);
router.delete("/veiculos-entrega/:id", authMiddleware, controller.deletarVeiculo);

router.get("/entregadores", authMiddleware, controller.listarEntregadores);
router.post("/entregadores", authMiddleware, controller.criarEntregador);
router.put("/entregadores/:id", authMiddleware, controller.atualizarEntregador);
router.delete("/entregadores/:id", authMiddleware, controller.deletarEntregador);

export default router;
