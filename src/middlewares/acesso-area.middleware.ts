import { NextFunction, Response } from "express";
import acessosService from "../services/acessos.service";
import { AuthRequest } from "./auth.middleware";

export function authorizeArea(area: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Nao autenticado" });
      }

      const allowed = await acessosService.validarAcessoArea(req.userId, req.role, area);
      if (!allowed) {
        return res.status(403).json({
          error: "Acesso negado para esta area particular.",
          area,
          lgpd: "Acesso restrito por finalidade e minimizacao de dados.",
        });
      }

      return next();
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "erro_validando_area" });
    }
  };
}
