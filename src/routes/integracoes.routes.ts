import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import integracoesService from '../services/integracoes.service';

const router = Router();

router.get('/callback/:providerId', async (req, res, next) => {
  try {
    const providerId = req.params.providerId;
    const code = typeof req.query.code === 'string' ? req.query.code : undefined;
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const error = typeof req.query.error === 'string' ? req.query.error : undefined;
    const errorDescription = typeof req.query.error_description === 'string' ? req.query.error_description : undefined;

    const result = await integracoesService.processarCallbackOauth(providerId, {
      code,
      state,
      error,
      errorDescription,
    });

    const wantsJson = req.query.mode === 'json' || req.headers.accept?.includes('application/json');
    if (wantsJson) {
      return res.status(result.success ? 200 : 400).json(result);
    }

    return res.redirect(302, integracoesService.callbackRedirectUrl(result));
  } catch (error) {
    return next(error);
  }
});

router.use(authMiddleware);

router.get('/status', (req, res, next) => {
  try {
    const status = integracoesService.listarStatus();
    return res.json(status);
  } catch (error) {
    return next(error);
  }
});

router.get('/providers', (req, res, next) => {
  try {
    const segment = typeof req.query.segment === 'string' ? req.query.segment : undefined;
    const providers = integracoesService.listarProviders(segment);
    return res.json({ providers });
  } catch (error) {
    return next(error);
  }
});

router.get('/providers/:providerId/connect-url', (req: AuthRequest, res, next) => {
  try {
    const providerId = req.params.providerId;
    const shopDomainRaw = req.query.shopDomain;
    const shopDomain = typeof shopDomainRaw === 'string'
      ? shopDomainRaw
      : Array.isArray(shopDomainRaw) && typeof shopDomainRaw[0] === 'string'
        ? shopDomainRaw[0]
        : undefined;
    const userId = req.userId || '';

    const result = integracoesService.gerarConnectUrl(providerId, { shopDomain, userId });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.post('/providers/:providerId/test', async (req, res, next) => {
  try {
    const providerId = req.params.providerId;
    const result = await integracoesService.testarAcesso(providerId);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.get('/accounts', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId || '';
    const contas = await integracoesService.listarContasIntegradas(userId);
    return res.json({ contas });
  } catch (error) {
    return next(error);
  }
});

router.get('/webhooks/templates', (req, res, next) => {
  try {
    const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const templates = integracoesService.webhookTemplates(base);

    return res.json({ templates });
  } catch (error) {
    return next(error);
  }
});

export default router;
