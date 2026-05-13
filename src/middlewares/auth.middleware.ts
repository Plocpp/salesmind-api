import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_ACCESS_SECRET;

export interface AuthRequest extends Request {
    userId?: string;
    role?: string;
}

/**
 * Middleware que valida o token de autenticação enviado no header.
 * Se o token for válido, popula req.userId e req.role para uso nas rotas.
 */
export function authMiddleware(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    if (!SECRET) {
        return res.status(500).json({ error: "JWT_ACCESS_SECRET não configurado" });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: "Token não enviado" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, SECRET) as { userId: string; role?: string };

        req.userId = decoded.userId;
        req.role = decoded.role;

        return next();
    } catch {
        return res.status(401).json({ error: "Token inválido" });
    }
}
