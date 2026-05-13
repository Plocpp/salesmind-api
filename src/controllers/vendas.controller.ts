import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { VendasService } from "../services/vendas.service";

const vendasService = new VendasService();

const requireUser = (req: AuthRequest) => {
  if (!req.userId) throw new Error("Usuario nao autenticado");
  return req.userId;
};

export class VendasController {
  async criarCliente(req: AuthRequest, res: Response) {
    const cliente = await vendasService.criarCliente(req.body);
    return res.status(201).json(cliente);
  }

  async buscarCliente(req: AuthRequest, res: Response) {
    const { nome, telefone, email } = req.query;
    const cliente = await vendasService.buscarCliente(nome as string, telefone as string, email as string);
    return res.json(cliente);
  }

  async buscarProduto(req: AuthRequest, res: Response) {
    const { nome, codigo, codigoBarras } = req.query;
    const produto = await vendasService.buscarProduto({
      nome: nome as string,
      codigo: codigo as string,
      codigoBarras: codigoBarras as string,
    });
    return res.json(produto);
  }

  async criarVenda(req: AuthRequest, res: Response) {
    const userId = requireUser(req);
    const venda = await vendasService.criarVenda(req.body, userId);
    return res.status(201).json(venda);
  }

  async listarVendas(req: AuthRequest, res: Response) {
    const userId = requireUser(req);
    const vendas = await vendasService.listarVendas(userId, {
      status: req.query.status as string,
      origem: req.query.origem as string,
      inicio: req.query.inicio as string,
      fim: req.query.fim as string,
      clienteId: req.query.clienteId as string,
    });
    return res.json(vendas);
  }

  async dashboardVendas(req: AuthRequest, res: Response) {
    const dashboard = await vendasService.dashboardVendas();
    return res.json(dashboard);
  }

  async abrirCaixa(req: AuthRequest, res: Response) {
    const userId = requireUser(req);
    const caixa = await vendasService.abrirCaixa(req.body, userId);
    return res.status(201).json(caixa);
  }

  async movimentoCaixa(req: AuthRequest, res: Response) {
    const userId = requireUser(req);
    const movimento = await vendasService.movimentoCaixa(req.body, userId);
    return res.status(201).json(movimento);
  }

  async listarCaixas(req: AuthRequest, res: Response) {
    const userId = requireUser(req);
    const caixas = await vendasService.listarCaixas(userId);
    return res.json(caixas);
  }

  async listarMovimentosCaixa(req: AuthRequest, res: Response) {
    requireUser(req);
    const movimentos = await vendasService.listarMovimentosCaixa();
    return res.json(movimentos);
  }

  async criarListaPreco(req: AuthRequest, res: Response) {
    requireUser(req);
    const lista = await vendasService.criarListaPreco(req.body);
    return res.status(201).json(lista);
  }

  async listarListasPreco(req: AuthRequest, res: Response) {
    requireUser(req);
    const listas = await vendasService.listarListasPreco();
    return res.json(listas);
  }

  async criarOrcamento(req: AuthRequest, res: Response) {
    const userId = requireUser(req);
    const orcamento = await vendasService.criarOrcamento(req.body, userId);
    return res.status(201).json(orcamento);
  }

  async listarOrcamentos(req: AuthRequest, res: Response) {
    const userId = requireUser(req);
    const orcamentos = await vendasService.listarOrcamentos(userId);
    return res.json(orcamentos);
  }

  async rankingClientes(req: AuthRequest, res: Response) {
    requireUser(req);
    const ranking = await vendasService.rankingClientes();
    return res.json(ranking);
  }

  async saldoClientes(req: AuthRequest, res: Response) {
    requireUser(req);
    const saldos = await vendasService.saldoClientes();
    return res.json(saldos);
  }

  async listarFormasRecebimento(req: AuthRequest, res: Response) {
    requireUser(req);
    const formas = await vendasService.listarFormasRecebimento();
    return res.json(formas);
  }

  async modeloDemonstrativo(req: AuthRequest, res: Response) {
    requireUser(req);
    const periodoDias = req.query.periodoDias ? Number(req.query.periodoDias) : 30;
    const demonstrativo = await vendasService.modeloDemonstrativo(periodoDias);
    return res.json(demonstrativo);
  }

  async obterConfiguracao(req: AuthRequest, res: Response) {
    requireUser(req);
    const configuracao = await vendasService.obterConfiguracaoVendas();
    return res.json(configuracao);
  }

  async salvarConfiguracao(req: AuthRequest, res: Response) {
    const userId = requireUser(req);
    const configuracao = await vendasService.salvarConfiguracaoVendas(req.body, userId);
    return res.json(configuracao);
  }
}
