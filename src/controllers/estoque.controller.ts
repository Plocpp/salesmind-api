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
  listarCatalogoItens = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const itens = await estoqueService.listarCatalogoItens({
      q: this.asString(req.query.q),
      tipo: this.asString(req.query.tipo),
      grupoId: this.asString(req.query.grupoId),
      marcaId: this.asString(req.query.marcaId),
      ativo: this.asBoolean(req.query.ativo),
      statusEstoque: this.asString(req.query.statusEstoque),
      somenteComValidade: this.asBoolean(req.query.somenteComValidade),
    });
    return res.json(itens);
  };

  atalhosOperacionais = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const atalhos = await estoqueService.atalhosOperacionais();
    return res.json(atalhos);
  };

  criarItemCatalogo = async (req: AuthRequest, res: Response) => {
    const usuarioId = requireUser(req);
    const item = await estoqueService.criarItemCatalogo(req.body, usuarioId);
    return res.status(201).json(item);
  };

  atualizarItemCatalogo = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const item = await estoqueService.atualizarItemCatalogo(req.params.id, req.body);
    return res.json(item);
  };

  indicadoresValidade = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const janelaDias = this.asNumber(req.query.janelaDias) || 60;
    const indicadores = await estoqueService.indicadoresValidade(janelaDias);
    return res.json(indicadores);
  };

  sugestoesCompra = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const sugestoes = await estoqueService.sugestoesCompra({
      coberturaDias: this.asNumber(req.query.coberturaDias),
      incluirItensSemVenda: this.asBoolean(req.query.incluirItensSemVenda),
    });
    return res.json(sugestoes);
  };

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
      q: this.asString(req.query.q),
      abaixoMinimo: this.asBoolean(req.query.abaixoMinimo),
      comReserva: this.asBoolean(req.query.comReserva),
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
    const pedidos = await estoqueService.listarPedidosCompra({
      status: this.asString(req.query.status),
      fornecedorId: this.asString(req.query.fornecedorId),
      q: this.asString(req.query.q),
      inicio: this.asString(req.query.inicio),
      fim: this.asString(req.query.fim),
    });
    return res.json(pedidos);
  };

  obterAuditoriaIaPedidoCompra = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const auditoria = await estoqueService.obterAuditoriaIaPedidoCompra(req.params.id);
    return res.json(auditoria);
  };

  cancelarPedidoCompra = async (req: AuthRequest, res: Response) => {
    const usuarioId = requireUser(req);
    const pedido = await estoqueService.cancelarPedidoCompra(req.params.id, req.body, usuarioId);
    return res.json(pedido);
  };

  receberNotaFiscalCompra = async (req: AuthRequest, res: Response) => {
    const usuarioId = requireUser(req);
    const recebimento = await estoqueService.receberNotaFiscalCompra(req.body, usuarioId);
    return res.status(201).json(recebimento);
  };

  importarNotaFiscalCompraXml = async (req: AuthRequest, res: Response) => {
    const usuarioId = requireUser(req);
    const recebimento = await estoqueService.importarNotaFiscalCompraXml(req.body, usuarioId);
    return res.status(201).json(recebimento);
  };

  previewImportacaoNotaFiscalCompraXml = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const preview = await estoqueService.previewImportacaoNotaFiscalCompraXml(req.body);
    return res.json(preview);
  };

  listarNotasFiscaisCompra = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const notas = await estoqueService.listarNotasFiscaisCompra({
      inicio: this.asString(req.query.inicio),
      fim: this.asString(req.query.fim),
      fornecedorId: this.asString(req.query.fornecedorId),
      statusPedido: this.asString(req.query.statusPedido),
    });
    return res.json(notas);
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

  private asBoolean(value: unknown) {
    const raw = this.asString(value);
    if (raw === undefined) return undefined;
    if (raw.toLowerCase() === "true") return true;
    if (raw.toLowerCase() === "false") return false;
    return undefined;
  }

  private asNumber(value: unknown) {
    const raw = this.asString(value);
    if (raw === undefined) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}

export default new EstoqueController();
