import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import financeiroService from "../services/financeiro.service";

const requireUser = (req: AuthRequest) => {
  if (!req.userId) {
    throw new Error("Usuario nao autenticado");
  }

  return req.userId;
};

class FinanceiroController {
  criarLancamento = async (req: AuthRequest, res: Response) => {
    const usuarioId = requireUser(req);
    const lancamento = await financeiroService.criarLancamento(req.body, usuarioId);
    return res.status(201).json(lancamento);
  };

  listarLancamentos = async (req: AuthRequest, res: Response) => {
    const usuarioId = requireUser(req);
    const lancamentos = await financeiroService.listarLancamentos({
      usuarioId,
      status: this.asString(req.query.status),
      tipo: this.asString(req.query.tipo),
      origem: this.asString(req.query.origem),
      empresaId: this.asString(req.query.empresaId),
      inicio: this.asString(req.query.inicio),
      fim: this.asString(req.query.fim),
    });

    return res.json(lancamentos);
  };

  baixarLancamento = async (req: AuthRequest, res: Response) => {
    const usuarioId = requireUser(req);
    const id = this.asString(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "ID invalido" });
    }

    const lancamento = await financeiroService.baixarLancamento(
      id,
      Number(req.body.valorPago),
      usuarioId,
      req.body.pagamento ? new Date(req.body.pagamento) : new Date(),
    );

    return res.json(lancamento);
  };

  atualizarLancamento = async (req: AuthRequest, res: Response) => {
    const usuarioId = requireUser(req);
    const id = this.asString(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "ID invalido" });
    }

    const lancamento = await financeiroService.atualizarLancamento(id, req.body, usuarioId);
    return res.json(lancamento);
  };

  enviarCobrancaManual = async (req: AuthRequest, res: Response) => {
    const usuarioId = requireUser(req);
    const id = this.asString(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "ID invalido" });
    }

    const resultado = await financeiroService.enviarCobrancaManual(id, req.body, usuarioId);
    return res.json(resultado);
  };

  criarConta = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const conta = await financeiroService.criarConta(req.body);
    return res.status(201).json(conta);
  };

  listarContas = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const contas = await financeiroService.listarContas(this.asString(req.query.empresaId));
    return res.json(contas);
  };

  criarCategoria = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const categoria = await financeiroService.criarCategoria(req.body);
    return res.status(201).json(categoria);
  };

  listarCategorias = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const categorias = await financeiroService.listarCategorias(this.asString(req.query.empresaId));
    return res.json(categorias);
  };

  criarFormaPagamento = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const formaPagamento = await financeiroService.criarFormaPagamento(req.body);
    return res.status(201).json(formaPagamento);
  };

  listarFormasPagamento = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const formasPagamento = await financeiroService.listarFormasPagamento(this.asString(req.query.empresaId));
    return res.json(formasPagamento);
  };

  conciliarCartao = async (req: AuthRequest, res: Response) => {
    const usuarioId = requireUser(req);
    const conciliacao = await financeiroService.conciliarCartao(req.body, usuarioId);
    return res.status(201).json(conciliacao);
  };

  demonstrativo = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const demonstrativo = await financeiroService.demonstrativo({
      inicio: this.asString(req.query.inicio),
      fim: this.asString(req.query.fim),
      empresaId: this.asString(req.query.empresaId),
    });

    return res.json(demonstrativo);
  };

  fluxoCaixa = async (req: AuthRequest, res: Response) => {
    requireUser(req);
    const fluxo = await financeiroService.fluxoCaixa({
      dias: Number(this.asString(req.query.dias) || 30),
      empresaId: this.asString(req.query.empresaId),
    });

    return res.json(fluxo);
  };

  private asString(value: unknown) {
    if (!value) {
      return undefined;
    }

    return Array.isArray(value) ? String(value[0]) : String(value);
  }
}

export default new FinanceiroController();
