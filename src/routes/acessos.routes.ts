import { Router } from "express";
import acessosController from "../controllers/acessos.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorizeRole } from "../middlewares/role.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/me", acessosController.listarMeusAcessos);

router.get("/", authorizeRole(["ADMIN", "GERENTE"]), acessosController.listarAcessos);
router.post("/", authorizeRole(["ADMIN", "GERENTE"]), acessosController.criarAcesso);
router.post("/:id/revoke", authorizeRole(["ADMIN", "GERENTE"]), acessosController.revogarAcesso);
router.get("/auditoria/lgpd", authorizeRole(["ADMIN", "GERENTE"]), acessosController.listarAuditoria);

export default router;
