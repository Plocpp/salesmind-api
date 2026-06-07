import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import acessosService from "../services/acessos.service";

class AcessosController {
  async listarPerfisHierarquia(req: AuthRequest, res: Response) {
    try {
      const data = await acessosService.listarPerfisHierarquia();
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "erro_listar_perfis_hierarquia" });
    }
  }

  async criarPerfilHierarquia(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Nao autenticado" });
      }

      const payload = req.body || {};
      const data = await acessosService.criarPerfilHierarquia({
        nome: String(payload.nome || ""),
        descricao: String(payload.descricao || ""),
        nivel: Number(payload.nivel || 0),
        roleBase: String(payload.roleBase || ""),
        areasPadrao: Array.isArray(payload.areasPadrao) ? payload.areasPadrao : [],
        dadosPermitidosPadrao: Array.isArray(payload.dadosPermitidosPadrao) ? payload.dadosPermitidosPadrao : [],
        autorUserId: req.userId,
      });

      return res.status(201).json(data);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "erro_criar_perfil_hierarquia" });
    }
  }

  async listarFuncionariosHierarquia(req: AuthRequest, res: Response) {
    try {
      const data = await acessosService.listarFuncionariosHierarquia();
      return res.json({ funcionarios: data });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "erro_listar_funcionarios_hierarquia" });
    }
  }

  async criarFuncionarioHierarquia(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Nao autenticado" });
      }

      const payload = req.body || {};

      const result = await acessosService.criarFuncionarioHierarquia({
        nome: String(payload.nome || ""),
        email: String(payload.email || ""),
        senha: String(payload.senha || ""),
        perfilId: String(payload.perfilId || ""),
        areasExtras: Array.isArray(payload.areasExtras) ? payload.areasExtras : [],
        areasRemovidas: Array.isArray(payload.areasRemovidas) ? payload.areasRemovidas : [],
        dadosPermitidosExtras: Array.isArray(payload.dadosPermitidosExtras) ? payload.dadosPermitidosExtras : [],
        dadosPermitidosRemovidos: Array.isArray(payload.dadosPermitidosRemovidos)
          ? payload.dadosPermitidosRemovidos
          : [],
        autorUserId: req.userId,
      });

      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "erro_criar_funcionario_hierarquia" });
    }
  }

  async atualizarPermissoesHierarquia(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Nao autenticado" });
      }

      const payload = req.body || {};
      const userIdAlvo = String(req.params.userId || "");

      const result = await acessosService.atualizarPermissoesHierarquia({
        userIdAlvo,
        areasExtras: Array.isArray(payload.areasExtras) ? payload.areasExtras : [],
        areasRemovidas: Array.isArray(payload.areasRemovidas) ? payload.areasRemovidas : [],
        dadosPermitidosExtras: Array.isArray(payload.dadosPermitidosExtras) ? payload.dadosPermitidosExtras : [],
        dadosPermitidosRemovidos: Array.isArray(payload.dadosPermitidosRemovidos)
          ? payload.dadosPermitidosRemovidos
          : [],
        justificativa: payload.justificativa ? String(payload.justificativa) : undefined,
        autorUserId: req.userId,
      });

      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "erro_atualizar_permissoes_hierarquia" });
    }
  }

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
