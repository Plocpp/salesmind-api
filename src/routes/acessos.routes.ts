import { Router } from "express";
import acessosController from "../controllers/acessos.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorizeRole } from "../middlewares/role.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/me", acessosController.listarMeusAcessos);

router.get("/hierarquia/perfis", authorizeRole(["ADMIN"]), acessosController.listarPerfisHierarquia);
router.post("/hierarquia/perfis", authorizeRole(["ADMIN"]), acessosController.criarPerfilHierarquia);
router.get("/hierarquia/funcionarios", authorizeRole(["ADMIN"]), acessosController.listarFuncionariosHierarquia);
router.post("/hierarquia/funcionarios", authorizeRole(["ADMIN"]), acessosController.criarFuncionarioHierarquia);
router.put(
	"/hierarquia/funcionarios/:userId/permissoes",
	authorizeRole(["ADMIN"]),
	acessosController.atualizarPermissoesHierarquia
);
router.put(
	"/hierarquia/funcionarios/:userId/cargo",
	authorizeRole(["ADMIN"]),
	acessosController.alterarCargoHierarquia
);
router.put(
	"/hierarquia/funcionarios/:userId/cadastro",
	authorizeRole(["ADMIN"]),
	acessosController.atualizarCadastroHierarquia
);

router.get("/", authorizeRole(["ADMIN", "GERENTE"]), acessosController.listarAcessos);
router.post("/", authorizeRole(["ADMIN", "GERENTE"]), acessosController.criarAcesso);
router.post("/:id/revoke", authorizeRole(["ADMIN", "GERENTE"]), acessosController.revogarAcesso);
router.get("/auditoria/lgpd", authorizeRole(["ADMIN", "GERENTE"]), acessosController.listarAuditoria);

export default router;
