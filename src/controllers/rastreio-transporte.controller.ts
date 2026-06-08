import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { CadastrosAuxiliaresService } from '../services/cadastros-auxiliares.service';
import { RastreioTransporteService } from '../services/rastreio-transporte.service';

const service = new RastreioTransporteService();
const cadastrosService = new CadastrosAuxiliaresService();

const getBearerToken = (req: AuthRequest) => {
  const auth = req.headers.authorization || '';
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  return auth.slice(7).trim();
};

const getLimit = (raw?: string | string[]) => {
  if (!raw) return 500;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return Number(value || 500);
};

const getStaleMinutes = (raw?: string | string[]) => {
  if (!raw) return 5;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return Number(value || 5);
};

const requireUser = (req: AuthRequest) => {
  if (!req.userId) throw new Error('Usuario nao autenticado.');
  return req.userId;
};

export class RastreioTransporteController {
  async listarEntregadores(req: AuthRequest, res: Response) {
    requireUser(req);
    const entregadores = await service.listarEntregadores();
    if (Array.isArray(entregadores) && entregadores.length > 0) {
      return res.json(entregadores);
    }

    const fallback = await cadastrosService.listarEntregadores();
    return res.json(
      (fallback || []).map((item: any) => ({
        id: item.id,
        nome: item.nome,
        ativo: Boolean(item.ativo),
        telefone: item.telefone || null,
        email: item.email || null,
      }))
    );
  }

  async criarDispositivo(req: AuthRequest, res: Response) {
    const userId = requireUser(req);
    const result = await service.criarDispositivo(req.body, userId);
    return res.status(201).json(result);
  }

  async gerarCodigoAtivacao(req: AuthRequest, res: Response) {
    const userId = requireUser(req);
    const result = await service.gerarCodigoAtivacaoDispositivo(req.body, userId);
    return res.status(201).json(result);
  }

  async listarDispositivos(req: AuthRequest, res: Response) {
    requireUser(req);
    return res.json(await service.listarDispositivos());
  }

  async revogarDispositivo(req: AuthRequest, res: Response) {
    requireUser(req);
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    return res.json(await service.revogarDispositivo(id));
  }

  async listarSessoesAtivas(req: AuthRequest, res: Response) {
    requireUser(req);
    return res.json(await service.listarSessoesAtivas());
  }

  async resumoOperacional(req: AuthRequest, res: Response) {
    requireUser(req);
    const staleMinutes = getStaleMinutes(req.query.staleMinutes as string | string[] | undefined);
    return res.json(await service.resumoOperacional(staleMinutes));
  }

  async obterUltimaPosicao(req: AuthRequest, res: Response) {
    requireUser(req);
    const entregadorId = Array.isArray(req.params.entregadorId) ? req.params.entregadorId[0] : req.params.entregadorId;
    return res.json(await service.obterUltimaPosicaoEntregador(entregadorId));
  }

  async listarPontosSessao(req: AuthRequest, res: Response) {
    requireUser(req);
    const sessaoId = Array.isArray(req.params.sessaoId) ? req.params.sessaoId[0] : req.params.sessaoId;
    const limit = getLimit(req.query.limit as string | string[] | undefined);
    return res.json(await service.listarPontosSessao(sessaoId, limit));
  }

  async obterRastreioPublico(req: AuthRequest, res: Response) {
    const sessaoId = Array.isArray(req.params.sessaoId) ? req.params.sessaoId[0] : req.params.sessaoId;
    const limit = getLimit(req.query.limit as string | string[] | undefined);

    try {
      return res.json(await service.obterRastreioPublico(sessaoId, limit));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sessao de rastreio nao encontrada.';
      return res.status(404).json({ success: false, message });
    }
  }

  // Endpoints para app mobile (ativacao por codigo ou sessao autenticada por token do dispositivo)
  async ativarDispositivoMobile(req: AuthRequest, res: Response) {
    return res.status(201).json(await service.ativarDispositivoPorCodigo(req.body));
  }

  async iniciarSessaoMobile(req: AuthRequest, res: Response) {
    const token = getBearerToken(req);
    return res.status(201).json(await service.iniciarSessaoMobile(token, req.body));
  }

  async registrarPontoMobile(req: AuthRequest, res: Response) {
    const token = getBearerToken(req);
    const sessaoId = Array.isArray(req.params.sessaoId) ? req.params.sessaoId[0] : req.params.sessaoId;
    return res.status(201).json(await service.registrarPontoMobile(sessaoId, token, req.body));
  }

  async finalizarSessaoMobile(req: AuthRequest, res: Response) {
    const token = getBearerToken(req);
    const sessaoId = Array.isArray(req.params.sessaoId) ? req.params.sessaoId[0] : req.params.sessaoId;
    return res.json(await service.finalizarSessaoMobile(sessaoId, token, req.body));
  }
}
