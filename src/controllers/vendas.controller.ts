import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { VendasService } from "../services/vendas.service";

const vendasService = new VendasService();

const requireUser = (req: AuthRequest) => {
  if (!req.userId) throw new Error("Usuario nao autenticado");
  return req.userId;
};

const getParam = (value: string | string[]) => Array.isArray(value) ? value[0] : value;

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

  async resumoCaixa(req: AuthRequest, res: Response) {
    requireUser(req);
    const resumo = await vendasService.resumoCaixa(getParam(req.params.id));
    return res.json(resumo);
  }

  async fecharCaixa(req: AuthRequest, res: Response) {
    const userId = requireUser(req);
    const fechamento = await vendasService.fecharCaixa(getParam(req.params.id), userId, req.body);
    return res.json(fechamento);
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

  async atualizarListaPreco(req: AuthRequest, res: Response) {
    requireUser(req);
    const lista = await vendasService.atualizarListaPreco(getParam(req.params.id), req.body);
    return res.json(lista);
  }

  async deletarListaPreco(req: AuthRequest, res: Response) {
    requireUser(req);
    await vendasService.deletarListaPreco(getParam(req.params.id));
    return res.status(204).send();
  }

  async criarFormaRecebimento(req: AuthRequest, res: Response) {
    requireUser(req);
    const forma = await vendasService.criarFormaRecebimento(req.body);
    return res.status(201).json(forma);
  }

  async atualizarFormaRecebimento(req: AuthRequest, res: Response) {
    requireUser(req);
    const forma = await vendasService.atualizarFormaRecebimento(getParam(req.params.id), req.body);
    return res.json(forma);
  }

  async converterOrcamentoParaVenda(req: AuthRequest, res: Response) {
    const userId = requireUser(req);
    const venda = await vendasService.converterOrcamentoParaVenda(getParam(req.params.id), userId);
    return res.status(201).json(venda);
  }

  async enviarOrcamentoPorEmail(req: AuthRequest, res: Response) {
    requireUser(req);
    const { email } = req.body;
    await vendasService.enviarOrcamentoPorEmail(getParam(req.params.id), email);
    return res.json({ message: 'Email enviado com sucesso' });
  }

  async deletarOrcamento(req: AuthRequest, res: Response) {
    requireUser(req);
    await vendasService.deletarOrcamento(getParam(req.params.id));
    return res.status(204).send();
  }

  async registrarPagamento(req: AuthRequest, res: Response) {
    requireUser(req);
    const pagamento = await vendasService.registrarPagamento(getParam(req.params.id), req.body);
    return res.json(pagamento);
  }

  async renovarPacote(req: AuthRequest, res: Response) {
    const userId = requireUser(req);
    const resultado = await vendasService.renovarPacote(getParam(req.params.id), userId);
    return res.json(resultado);
  }

  async cancelarPacote(req: AuthRequest, res: Response) {
    const userId = requireUser(req);
    const resultado = await vendasService.cancelarPacote(getParam(req.params.id), userId);
    return res.json(resultado);
  }
}
