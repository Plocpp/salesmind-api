import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../database/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import authService from "../services/auth.service";

class AuthController {
    // =========================
    // 🔐 AUTENTICAÇÃO
    // =========================

    /**
     * Registra um novo usuário e retorna o registro criado.
     */
    async register(req: Request, res: Response) {
        try {
            const usuario = await authService.register(req.body);
            return res.status(201).json(usuario);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    /**
     * Autentica o usuário e retorna access + refresh tokens.
     */
    async login(req: Request, res: Response) {
        try {
            const { email, senha } = req.body;

            const usuario = await authService.buscarPorEmail(email);

            if (!usuario) {
                return res.status(404).json({ error: "Usuário não encontrado" });
            }

            const senhaValida = await bcrypt.compare(senha, usuario.senha);

            if (!senhaValida) {
                return res.status(401).json({ error: "Senha inválida" });
            }

            const accessToken = jwt.sign(
                { userId: usuario.id, role: usuario.role },
                "access_secret",
                { expiresIn: "15m" }
            );

            const refreshToken = jwt.sign(
                { userId: usuario.id },
                "refresh_secret",
                { expiresIn: "7d" }
            );

            // 🔥 salva refresh no banco
            await prisma.usuario.update({
                where: { id: usuario.id },
                data: { refreshToken }
            });

            return res.json({ accessToken, refreshToken, role: usuario.role });

        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    // =========================
    // 👤 PERFIL
    // =========================

    /**
     * Retorna os dados do usuário autenticado.
     */
    async me(req: AuthRequest, res: Response) {
        try {
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({ error: "Usuário não autenticado" });
            }

            const usuario = await prisma.usuario.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    createdAt: true
                }
            });

            return res.json(usuario);

        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * Atualiza o perfil do usuário autenticado.
     */
    async updateMe(req: AuthRequest, res: Response) {
        try {
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({ error: "Usuário não autenticado" });
            }

            const { nome, email } = req.body;

            const usuarioAtualizado = await prisma.usuario.update({
                where: { id: userId },
                data: { nome, email },
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    createdAt: true
                }
            });

            return res.json(usuarioAtualizado);

        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * Altera a senha do usuário autenticado após validação da senha atual.
     */
    async changePassword(req: AuthRequest, res: Response) {
        try {
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({ error: "Usuário não autenticado" });
            }

            const { senhaAtual, novaSenha } = req.body;

            const usuario = await prisma.usuario.findUnique({
                where: { id: userId }
            });

            if (!usuario) {
                return res.status(404).json({ error: "Usuário não encontrado" });
            }

            const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);

            if (!senhaValida) {
                return res.status(401).json({ error: "Senha atual incorreta" });
            }

            const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

            await prisma.usuario.update({
                where: { id: userId },
                data: { senha: novaSenhaHash }
            });

            return res.json({ message: "Senha atualizada com sucesso" });

        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // =========================
    // 🔄 SESSÃO (TOKENS)
    // =========================

    /**
     * Gera um novo access token usando o refresh token válido.
     */
    async refresh(req: Request, res: Response) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({ error: "Refresh token não enviado" });
            }

            const decoded = jwt.verify(
                refreshToken,
                "refresh_secret"
            ) as { userId: string };

            // 🔥 valida no banco (MELHORIA IMPORTANTE)
            const usuario = await prisma.usuario.findFirst({
                where: {
                    id: decoded.userId,
                    refreshToken: refreshToken
                }
            });

            if (!usuario) {
                return res.status(401).json({ error: "Refresh token inválido" });
            }

            const newAccessToken = jwt.sign(
                { userId: usuario.id, role: usuario.role },
                "access_secret",
                { expiresIn: "15m" }
            );

            return res.json({ accessToken: newAccessToken });

        } catch {
            return res.status(401).json({ error: "Refresh token inválido" });
        }
    }

    /**
     * Limpa o refresh token do usuário para encerrar a sessão.
     */
    async logout(req: AuthRequest, res: Response) {
        try {
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({ error: "Usuário não autenticado" });
            }

            await prisma.usuario.update({
                where: { id: userId },
                data: { refreshToken: null }
            });

            return res.json({ message: "Logout realizado com sucesso" });

        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}

export default new AuthController();