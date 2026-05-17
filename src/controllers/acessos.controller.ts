import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import acessosService from "../services/acessos.service";

class AcessosController {
  async criarAcesso(req: AuthRequest, res: Response) {
    try {
      const autorUserId = req.userId || "";
      const payload = req.body || {};

      const result = await acessosService.cadastrarAcesso({
        userIdAlvo: String(payload.userIdAlvo || ""),
        nomeAcesso: String(payload.nomeAcesso || "Acesso restrito"),
        areasPermitidas: Array.isArray(payload.areasPermitidas) ? payload.areasPermitidas : [],
        restricoes: payload.restricoes || {},
        dadosPermitidos: Array.isArray(payload.dadosPermitidos) ? payload.dadosPermitidos : [],
        baseLegal: String(payload.baseLegal || ""),
        finalidade: String(payload.finalidade || ""),
        justificativa: payload.justificativa ? String(payload.justificativa) : undefined,
        expiraEm: payload.expiraEm ? String(payload.expiraEm) : undefined,
        autorUserId,
      });

      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "erro_criar_acesso" });
    }
  }

  async listarAcessos(req: AuthRequest, res: Response) {
    try {
      const data = await acessosService.listarTodosAcessos();
      return res.json({ acessos: data });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "erro_listar_acessos" });
    }
  }

  async listarMeusAcessos(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Nao autenticado" });
      }

      const [acessos, areasPermitidas] = await Promise.all([
        acessosService.listarAcessosPorUsuario(req.userId),
        acessosService.listarAreasPermitidas(req.userId, req.role),
      ]);

      return res.json({ acessos, areasPermitidas });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "erro_listar_meus_acessos" });
    }
  }

  async revogarAcesso(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Nao autenticado" });
      }

      const acessoId = String(req.params.id || "");
      const motivo = req.body?.motivo ? String(req.body.motivo) : undefined;

      const result = await acessosService.revogarAcesso({
        acessoId,
        motivo,
        autorUserId: req.userId,
      });

      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "erro_revogar_acesso" });
    }
  }

  async listarAuditoria(req: AuthRequest, res: Response) {
    try {
      const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
      const data = await acessosService.listarAuditoriaLgpd(userId);
      return res.json({ auditoria: data });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "erro_listar_auditoria" });
    }
  }
}

export default new AcessosController();
