import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { CadastrosAuxiliaresService } from "../services/cadastros-auxiliares.service";

const service = new CadastrosAuxiliaresService();

const getId = (req: Request) => Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

export class CadastrosAuxiliaresController {
  listarVendedores = asyncHandler(async (_req: Request, res: Response) => {
    res.json(await service.listarVendedores());
  });

  criarVendedor = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await service.criarVendedor(req.body));
  });

  atualizarVendedor = asyncHandler(async (req: Request, res: Response) => {
    res.json(await service.atualizarVendedor(getId(req), req.body));
  });

  deletarVendedor = asyncHandler(async (req: Request, res: Response) => {
    await service.deletarVendedor(getId(req));
    res.status(204).send();
  });

  listarVeiculos = asyncHandler(async (_req: Request, res: Response) => {
    res.json(await service.listarVeiculos());
  });

  criarVeiculo = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await service.criarVeiculo(req.body));
  });

  atualizarVeiculo = asyncHandler(async (req: Request, res: Response) => {
    res.json(await service.atualizarVeiculo(getId(req), req.body));
  });

  deletarVeiculo = asyncHandler(async (req: Request, res: Response) => {
    await service.deletarVeiculo(getId(req));
    res.status(204).send();
  });

  listarEntregadores = asyncHandler(async (_req: Request, res: Response) => {
    res.json(await service.listarEntregadores());
  });

  criarEntregador = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await service.criarEntregador(req.body));
  });

  atualizarEntregador = asyncHandler(async (req: Request, res: Response) => {
    res.json(await service.atualizarEntregador(getId(req), req.body));
  });

  deletarEntregador = asyncHandler(async (req: Request, res: Response) => {
    await service.deletarEntregador(getId(req));
    res.status(204).send();
  });
}
