import { Router } from "express";
import onboardingPagamentoController from "../controllers/onboarding-pagamento.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/planos", onboardingPagamentoController.listarPlanos);
router.get("/preferencias", onboardingPagamentoController.preferencias);
router.post("/cadastro", onboardingPagamentoController.iniciarCadastro);
router.get("/status/:id", onboardingPagamentoController.statusCadastro);

// Endpoint para simular resultado de checkout em ambiente de desenvolvimento.
router.get("/mock-checkout/:id", onboardingPagamentoController.mockCheckout);

// Endpoint de webhook para confirmacao de pagamento e provisionamento da empresa.
router.post("/webhooks/pagamento", onboardingPagamentoController.webhookPagamento);

// Endpoint de teste de comunicação por e-mail.
router.post("/email/teste", onboardingPagamentoController.testeEmail);

// Fluxo de primeiro acesso e recuperação por e-mail.
router.post("/ativacao/enviar", onboardingPagamentoController.enviarCodigoAtivacao);
router.post("/ativacao/confirmar", onboardingPagamentoController.confirmarCodigoAtivacao);
router.post("/senha/solicitar-reset", onboardingPagamentoController.solicitarResetSenha);
router.post("/senha/confirmar-reset", onboardingPagamentoController.confirmarResetSenha);

// Suporte administrativo para atendimento ao cliente (assinatura, pagamento e login).
router.get("/suporte/assinaturas", authMiddleware, onboardingPagamentoController.listarAssinaturas);
router.put(
	"/suporte/assinaturas/:assinaturaId",
	authMiddleware,
	onboardingPagamentoController.editarAssinatura
);
router.put(
	"/suporte/assinaturas/:assinaturaId/meio-pagamento",
	authMiddleware,
	onboardingPagamentoController.editarMeioPagamento
);
router.put(
	"/suporte/clientes/:usuarioId/login",
	authMiddleware,
	onboardingPagamentoController.editarLoginCliente
);

export default router;
