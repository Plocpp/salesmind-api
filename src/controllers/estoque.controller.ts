import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import estoqueService from "../services/estoque.service";

const requireUser = (req: AuthRequest) => {
  if (!req.userId) {
    throw new Error("Usuario nao autenticado");
  }

  return req.userId;
};

class EstoqueController {
  criarGrupo = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const grupo = await estoqueService.criarGrupo(req.body);
    return res.status(201).json(grupo);
  };

  listarGrupos = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const grupos = await estoqueService.listarGrupos(this.asString(req.query.empresaId));
    return res.json(grupos);
  };

  criarDeposito = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const deposito = await estoqueService.criarDeposito(req.body);
    return res.status(201).json(deposito);
  };

  listarDepositos = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const depositos = await estoqueService.listarDepositos(this.asString(req.query.empresaId));
    return res.json(depositos);
  };

  movimentar = async (req: AuthRequest, res: Response) => {
    const usuarioId = requireUser(req);
    const movimentacao = await estoqueService.movimentar(req.body, usuarioId);
    return res.status(201).json(movimentacao);
  };

  reservar = async (req: AuthRequest, res: Response) => {
    const usuarioId = requireUser(req);
    const reserva = await estoqueService.reservar(
      req.body.produtoId,
      Number(req.body.quantidade),
      req.body.origemReferencia,
      usuarioId,
      req.body.depositoOrigemId,
    );
    return res.status(201).json(reserva);
  };

  liberarReserva = async (req: AuthRequest, res: Response) => {
    const usuarioId = requireUser(req);
    const reserva = await estoqueService.liberarReserva(
      req.body.produtoId,
      Number(req.body.quantidade),
      req.body.origemReferencia,
      usuarioId,
      req.body.depositoOrigemId,
    );
    return res.status(201).json(reserva);
  };

  listarSaldos = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const saldos = await estoqueService.listarSaldos({
      produtoId: this.asString(req.query.produtoId),
      depositoId: this.asString(req.query.depositoId),
    });
    return res.json(saldos);
  };

  analise = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const analise = await estoqueService.analise(this.asString(req.query.empresaId));
    return res.json(analise);
  };

  criarPedidoCompra = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const pedido = await estoqueService.criarPedidoCompra(req.body);
    return res.status(201).json(pedido);
  };

  listarPedidosCompra = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const pedidos = await estoqueService.listarPedidosCompra(this.asString(req.query.status));
    return res.json(pedidos);
  };

  receberNotaFiscalCompra = async (req: AuthRequest, res: Response) => {
    const usuarioId = requireUser(req);
    const recebimento = await estoqueService.receberNotaFiscalCompra(req.body, usuarioId);
    return res.status(201).json(recebimento);
  };

  abrirInventario = async (req: AuthRequest, res: Response) => {
    const usuarioId = requireUser(req);
    const inventario = await estoqueService.abrirInventario(req.body, usuarioId);
    return res.status(201).json(inventario);
  };

  private asString(value: unknown) {
    if (!value) {
      return undefined;
    }

    return Array.isArray(value) ? String(value[0]) : String(value);
  }
}

export default new EstoqueController();
