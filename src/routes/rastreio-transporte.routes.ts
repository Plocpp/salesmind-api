import { Router } from 'express';
import { RastreioTransporteController } from '../controllers/rastreio-transporte.controller';
import { authorizeArea } from '../middlewares/acesso-area.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { authorizeRole } from '../middlewares/role.middleware';

const router = Router();
const controller = new RastreioTransporteController();

// Rota pública de acompanhamento do cliente
router.get('/publico/sessoes/:sessaoId', controller.obterRastreioPublico);

// Backoffice (JWT)
router.get('/entregadores', authMiddleware, authorizeArea('rastreio-transporte'), controller.listarEntregadores);
router.post('/dispositivos', authMiddleware, authorizeRole(['ADMIN', 'GERENTE']), authorizeArea('rastreio-transporte'), controller.criarDispositivo);
router.get('/dispositivos', authMiddleware, authorizeArea('rastreio-transporte'), controller.listarDispositivos);
router.post('/dispositivos/:id/revogar', authMiddleware, authorizeRole(['ADMIN', 'GERENTE']), authorizeArea('rastreio-transporte'), controller.revogarDispositivo);
router.get('/sessoes/ativas', authMiddleware, authorizeArea('rastreio-transporte'), controller.listarSessoesAtivas);
router.get('/resumo', authMiddleware, authorizeArea('rastreio-transporte'), controller.resumoOperacional);
router.get('/entregadores/:entregadorId/ultima-posicao', authMiddleware, authorizeArea('rastreio-transporte'), controller.obterUltimaPosicao);
router.get('/sessoes/:sessaoId/pontos', authMiddleware, authorizeArea('rastreio-transporte'), controller.listarPontosSessao);

// Mobile app (token de dispositivo)
router.post('/mobile/sessoes/iniciar', controller.iniciarSessaoMobile);
router.post('/mobile/sessoes/:sessaoId/pontos', controller.registrarPontoMobile);
router.post('/mobile/sessoes/:sessaoId/finalizar', controller.finalizarSessaoMobile);

export default router;
