import { NextFunction, Response } from "express";
import { AuthRequest } from "./auth.middleware";

export function authorizeRole(role: string | string[]) {
    const roles = Array.isArray(role) ? role : [role];

    return (req: AuthRequest, res: Response, next: NextFunction) => {

        if (!req.userId) {
        return res.status(401).json({ error: "Não autenticado" });
        }

        const userRole = req.role;

        if (!userRole || !roles.includes(userRole)) {
        return res.status(403).json({ error: "Acesso negado" });
        }

        return next();
    };
}