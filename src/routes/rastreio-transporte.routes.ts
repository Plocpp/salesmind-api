import { Router } from 'express';
import { RastreioTransporteController } from '../controllers/rastreio-transporte.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { authorizeRole } from '../middlewares/role.middleware';

const router = Router();
const controller = new RastreioTransporteController();

// Backoffice (JWT)
router.get('/entregadores', authMiddleware, authorizeRole(['ADMIN']), controller.listarEntregadores);
router.post('/dispositivos', authMiddleware, authorizeRole(['ADMIN']), controller.criarDispositivo);
router.get('/dispositivos', authMiddleware, authorizeRole(['ADMIN']), controller.listarDispositivos);
router.post('/dispositivos/:id/revogar', authMiddleware, authorizeRole(['ADMIN']), controller.revogarDispositivo);
router.get('/sessoes/ativas', authMiddleware, authorizeRole(['ADMIN']), controller.listarSessoesAtivas);
router.get('/resumo', authMiddleware, authorizeRole(['ADMIN']), controller.resumoOperacional);
router.get('/entregadores/:entregadorId/ultima-posicao', authMiddleware, authorizeRole(['ADMIN']), controller.obterUltimaPosicao);
router.get('/sessoes/:sessaoId/pontos', authMiddleware, authorizeRole(['ADMIN']), controller.listarPontosSessao);

// Mobile app (token de dispositivo)
router.post('/mobile/sessoes/iniciar', controller.iniciarSessaoMobile);
router.post('/mobile/sessoes/:sessaoId/pontos', controller.registrarPontoMobile);
router.post('/mobile/sessoes/:sessaoId/finalizar', controller.finalizarSessaoMobile);

export default router;
