import { Router } from "express";
import authController from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// =========================
// 🔐 AUTENTICAÇÃO
// =========================
/**
 * 📝 Registrar novo usuário
 * POST /auth/register
 */
router.post("/register", authController.register);

/**
 * 🔑 Login
 * - Retorna accessToken + refreshToken
 * POST /auth/login
 */
router.post("/login", authController.login);

/**
 * 🔄 Refresh Token
 * - Gera novo accessToken a partir do refreshToken
 * POST /auth/refresh
 */
router.post("/refresh", authController.refresh);


// =========================
// 👤 PERFIL DO USUÁRIO
// =========================
/**
 * 👤 Dados do usuário autenticado
 * - Requer token
 * GET /auth/me
 */
router.get("/me", authMiddleware, authController.me);

/**
 * ✏️ Atualizar dados do usuário
 * - nome, email
 * - Requer token
 * PUT /auth/me
 */
router.put("/me", authMiddleware, authController.updateMe);

/**
 * 🔐 Alterar senha
 * - senhaAtual + novaSenha
 * - Requer token
 * PUT /auth/change-password
 */
router.put("/change-password", authMiddleware, authController.changePassword);


// =========================
// 🚪 SESSÃO
// =========================
/**
 * 🚪 Logout
 * - Invalida refreshToken no banco
 * - Requer token
 * POST /auth/logout
 */
router.post("/logout", authMiddleware, authController.logout);

export default router;