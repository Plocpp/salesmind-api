import { NextFunction, Response } from "express";
import { AuthRequest } from "./auth.middleware";

export function authorizeRole(role: string) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {

        if (!req.userId) {
        return res.status(401).json({ error: "Não autenticado" });
        }

        const userRole = (req as any).role;

        if (userRole !== role) {
        return res.status(403).json({ error: "Acesso negado" });
        }

        return next();
    };
    }