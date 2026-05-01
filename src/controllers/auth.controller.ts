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

    async register(req: Request, res: Response) {
        try {
            const usuario = await authService.register(req.body);
            return res.status(201).json(usuario);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

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
                process.env.JWT_ACCESS_SECRET!,
                { expiresIn: "15m" }
            );

            const refreshToken = jwt.sign(
                { userId: usuario.id },
                process.env.JWT_REFRESH_SECRET!,
                { expiresIn: "7d" }
            );

            await prisma.usuario.update({
                where: { id: usuario.id },
                data: { refreshToken }
            });

            return res.json({
                accessToken,
                refreshToken,
                role: usuario.role
            });

        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    // =========================
    // 👤 PERFIL
    // =========================

    private getUserId(req: AuthRequest, res: Response): string | null {
        if (!req.userId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return null;
        }
        return req.userId;
    }

    async me(req: AuthRequest, res: Response) {
        try {
            const userId = this.getUserId(req, res);
            if (!userId) return;

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

    async updateMe(req: AuthRequest, res: Response) {
        try {
            const userId = this.getUserId(req, res);
            if (!userId) return;

            const { nome, email } = req.body;

            const usuario = await prisma.usuario.update({
                where: { id: userId },
                data: { nome, email },
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

    async changePassword(req: AuthRequest, res: Response) {
        try {
            const userId = this.getUserId(req, res);
            if (!userId) return;

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
    // 🔄 SESSÃO
    // =========================

    async refresh(req: Request, res: Response) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({ error: "Refresh token não enviado" });
            }

            const decoded = jwt.verify(
                refreshToken,
                process.env.JWT_REFRESH_SECRET!
            ) as { userId: string };

            const usuario = await prisma.usuario.findFirst({
                where: {
                    id: decoded.userId,
                    refreshToken
                }
            });

            if (!usuario) {
                return res.status(401).json({ error: "Refresh token inválido" });
            }

            const accessToken = jwt.sign(
                { userId: usuario.id, role: usuario.role },
                process.env.JWT_ACCESS_SECRET!,
                { expiresIn: "15m" }
            );

            return res.json({ accessToken });

        } catch {
            return res.status(401).json({ error: "Refresh token inválido" });
        }
    }

    async logout(req: AuthRequest, res: Response) {
        try {
            const userId = this.getUserId(req, res);
            if (!userId) return;

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