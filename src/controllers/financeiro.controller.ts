import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { FinanceiroService } from "../services/financeiro.service";

const service = new FinanceiroService();
const getId = (req: Request) => Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

export class FinanceiroController {
  resumo = asyncHandler(async (_req: Request, res: Response) => {
    res.json(await service.resumo());
  });

  listarIntegracoes = asyncHandler(async (_req: Request, res: Response) => {
    res.json(await service.listarIntegracoes());
  });

  salvarIntegracao = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await service.salvarIntegracao(req.body));
  });

  atualizarIntegracao = asyncHandler(async (req: Request, res: Response) => {
    res.json(await service.atualizarIntegracao(getId(req), req.body));
  });

  obterConfiguracaoEmpresa = asyncHandler(async (_req: Request, res: Response) => {
    res.json(await service.obterConfiguracaoEmpresa());
  });

  salvarConfiguracaoEmpresa = asyncHandler(async (req: Request, res: Response) => {
    res.json(await service.salvarConfiguracaoEmpresa(req.body));
  });

  listarNotas = asyncHandler(async (_req: Request, res: Response) => {
    res.json(await service.listarNotas());
  });

  registrarNota = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await service.registrarNota(req.body));
  });

  atualizarTributacaoProduto = asyncHandler(async (req: Request, res: Response) => {
    res.json(await service.atualizarTributacaoProduto(getId(req), req.body));
  });
}
