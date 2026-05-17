import crypto from 'crypto';
import prisma from '../database/prisma';

export type IntegrationSegment = 'marketplaces' | 'gateways' | 'banks' | 'webhooks' | 'hub';
type IntegrationMode = 'oauth2_standard' | 'oauth2_shop_domain' | 'api_key' | 'manual';

export interface IntegrationProvider {
  id: string;
  nome: string;
  segmento: Exclude<IntegrationSegment, 'hub'>;
  modo: IntegrationMode;
  descricao: string;
  docsUrl: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  healthcheckUrl: string;
  scopes?: string[];
  webhookPath?: string;
  requisitos: string[];
  antiBlockChecks: string[];
  envPrefix: string;
}

type ConnectUrlResult = {
  providerId: string;
  providerName: string;
  ready: boolean;
  url: string;
  missing: string[];
  state?: string;
  warning?: string;
};

type OauthStateEntry = {
  providerId: string;
  createdAt: number;
  metadata?: Record<string, string>;
};

type TokenExchangeResult = {
  providerId: string;
  providerName: string;
  success: boolean;
  accountId?: string;
  details?: string;
};

const oauthStateStore = new Map<string, OauthStateEntry>();
const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;

const STORAGE_TABLE = 'integracao_conta';

const providers: IntegrationProvider[] = [
  {
    id: 'mercado-livre',
    nome: 'Mercado Livre',
    segmento: 'marketplaces',
    modo: 'oauth2_standard',
    descricao: 'OAuth2 com refresh token e validacoes de redirect_uri estatico.',
    docsUrl: 'https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao',
    authorizationUrl: 'https://auth.mercadolivre.com.br/authorization',
    tokenUrl: 'https://api.mercadolibre.com/oauth/token',
    healthcheckUrl: 'https://api.mercadolibre.com/sites',
    scopes: ['read', 'write', 'offline_access'],
    webhookPath: '/integracoes/webhooks/mercado-livre',
    requisitos: ['redirect_uri cadastrado exatamente igual no app', 'client_id e client_secret validos'],
    antiBlockChecks: ['validar state em callback', 'renovar refresh token sem reuso', 'controlar taxa de requests (429)'],
    envPrefix: 'MERCADO_LIVRE',
  },
  {
    id: 'shopify',
    nome: 'Shopify',
    segmento: 'marketplaces',
    modo: 'oauth2_shop_domain',
    descricao: 'OAuth2 por loja com validacao HMAC e state/nonce.',
    docsUrl: 'https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant',
    tokenUrl: 'https://{shop}/admin/oauth/access_token',
    healthcheckUrl: 'https://shopify.dev/docs',
    scopes: ['read_products', 'write_products', 'read_orders', 'write_orders'],
    webhookPath: '/integracoes/webhooks/shopify',
    requisitos: ['shop domain da loja (ex: loja.myshopify.com)', 'client_id e client_secret do app'],
    antiBlockChecks: ['validar hmac do callback', 'validar dominio *.myshopify.com', 'persistir nonce por sessao'],
    envPrefix: 'SHOPIFY',
  },
  {
    id: 'amazon-sp-api',
    nome: 'Amazon SP-API',
    segmento: 'marketplaces',
    modo: 'manual',
    descricao: 'Fluxo com Appstore/roles e credenciais AWS/LWA para producao.',
    docsUrl: 'https://developer-docs.amazon.com/sp-api',
    healthcheckUrl: 'https://sellercentral.amazon.com/sp-api-status',
    webhookPath: '/integracoes/webhooks/amazon-sp-api',
    requisitos: ['registro de app SP-API', 'roles aprovadas', 'credenciais AWS/LWA'],
    antiBlockChecks: ['usar sandbox para validacao inicial', 'seguir Data Protection Policy', 'monitorar Health Dashboard por regiao'],
    envPrefix: 'AMAZON_SP_API',
  },
  {
    id: 'nuvemshop',
    nome: 'Nuvemshop',
    segmento: 'marketplaces',
    modo: 'oauth2_standard',
    descricao: 'OAuth2 para lojas Nuvemshop/Tiendanube.',
    docsUrl: 'https://developers.nuvemshop.com.br/',
    authorizationUrl: 'https://www.nuvemshop.com.br/apps/authorize',
    tokenUrl: 'https://www.nuvemshop.com.br/apps/authorize/token',
    healthcheckUrl: 'https://developers.nuvemshop.com.br/',
    webhookPath: '/integracoes/webhooks/nuvemshop',
    requisitos: ['client_id e client_secret', 'redirect_uri aprovado'],
    antiBlockChecks: ['validar state', 'validar escopos minimos', 'confirmar assinatura de webhook'],
    envPrefix: 'NUVEMSHOP',
  },
  {
    id: 'woo-commerce',
    nome: 'WooCommerce',
    segmento: 'marketplaces',
    modo: 'api_key',
    descricao: 'Integracao REST por consumer_key e consumer_secret.',
    docsUrl: 'https://woocommerce.github.io/woocommerce-rest-api-docs/',
    healthcheckUrl: 'https://woocommerce.com/',
    webhookPath: '/integracoes/webhooks/woo-commerce',
    requisitos: ['url da loja', 'consumer_key', 'consumer_secret'],
    antiBlockChecks: ['forcar HTTPS', 'restringir permissao da API key', 'rotacionar credenciais periodicamente'],
    envPrefix: 'WOO_COMMERCE',
  },
  {
    id: 'vtex',
    nome: 'VTEX',
    segmento: 'marketplaces',
    modo: 'api_key',
    descricao: 'Integracao por AppKey/AppToken com APIs VTEX.',
    docsUrl: 'https://developers.vtex.com/docs',
    healthcheckUrl: 'https://status.vtex.com/',
    webhookPath: '/integracoes/webhooks/vtex',
    requisitos: ['accountName', 'appKey', 'appToken'],
    antiBlockChecks: ['controle de rate-limit', 'segregar app token por ambiente', 'assinar e validar callbacks'],
    envPrefix: 'VTEX',
  },
  {
    id: 'mercado-pago',
    nome: 'Mercado Pago',
    segmento: 'gateways',
    modo: 'oauth2_standard',
    descricao: 'OAuth2 para cobrancas e conciliacao em carteira Mercado Pago.',
    docsUrl: 'https://www.mercadopago.com.br/developers',
    authorizationUrl: 'https://auth.mercadopago.com/authorization',
    tokenUrl: 'https://api.mercadopago.com/oauth/token',
    healthcheckUrl: 'https://status.mercadopago.com/',
    webhookPath: '/integracoes/webhooks/mercado-pago',
    requisitos: ['app registrada no Mercado Pago', 'redirect_uri estatico'],
    antiBlockChecks: ['validar state e origem de callback', 'idempotencia em cobranca', 'verificacao de assinatura webhook'],
    envPrefix: 'MERCADO_PAGO',
  },
  {
    id: 'stripe',
    nome: 'Stripe',
    segmento: 'gateways',
    modo: 'api_key',
    descricao: 'API key com suporte forte a idempotencia e webhooks assinados.',
    docsUrl: 'https://docs.stripe.com/api/authentication',
    healthcheckUrl: 'https://status.stripe.com/',
    webhookPath: '/integracoes/webhooks/stripe',
    requisitos: ['secret key de servidor', 'webhook signing secret'],
    antiBlockChecks: ['usar idempotency-key em POST', 'nunca expor sk_live no frontend', 'validar Stripe-Signature'],
    envPrefix: 'STRIPE',
  },
  {
    id: 'paypal',
    nome: 'PayPal',
    segmento: 'gateways',
    modo: 'oauth2_standard',
    descricao: 'OAuth2 para APIs REST de pagamento e captura.',
    docsUrl: 'https://developer.paypal.com/api/rest/',
    authorizationUrl: 'https://www.paypal.com/signin/authorize',
    tokenUrl: 'https://api-m.paypal.com/v1/oauth2/token',
    healthcheckUrl: 'https://www.paypal-status.com/',
    webhookPath: '/integracoes/webhooks/paypal',
    requisitos: ['client_id e client_secret de app'],
    antiBlockChecks: ['usar ambiente sandbox para homologacao', 'validar webhook transmission', 'aplicar idempotencia por ordem'],
    envPrefix: 'PAYPAL',
  },
  {
    id: 'asaas',
    nome: 'Asaas',
    segmento: 'gateways',
    modo: 'api_key',
    descricao: 'API key para cobrancas, assinaturas e boleto/PIX.',
    docsUrl: 'https://docs.asaas.com/',
    healthcheckUrl: 'https://www.asaas.com/status',
    webhookPath: '/integracoes/webhooks/asaas',
    requisitos: ['api_key por ambiente'],
    antiBlockChecks: ['separar keys sandbox/producao', 'validar assinatura do webhook', 'controlar retries com idempotencia'],
    envPrefix: 'ASAAS',
  },
  {
    id: 'open-finance-brasil',
    nome: 'Open Finance Brasil',
    segmento: 'banks',
    modo: 'manual',
    descricao: 'Integracao depende de participante autorizado e certificacao.',
    docsUrl: 'https://openfinancebrasil.atlassian.net/wiki/spaces/OF/pages/17386149/Documenta+o+das+APIs',
    healthcheckUrl: 'https://openfinancebrasil.org.br/',
    requisitos: ['participacao formal no ecossistema', 'certificados e mTLS'],
    antiBlockChecks: ['adotar consentimento explicito e trilha', 'respeitar expiracao de consentimento', 'mTLS e rotacao de certificados'],
    envPrefix: 'OPEN_FINANCE_BR',
  },
  {
    id: 'webhook-central',
    nome: 'Webhooks SalesMind',
    segmento: 'webhooks',
    modo: 'manual',
    descricao: 'Ponto unico para recebimento e roteamento de eventos.',
    docsUrl: 'https://webhooks.fyi/',
    healthcheckUrl: 'https://webhooks.fyi/',
    webhookPath: '/integracoes/webhooks/:provider',
    requisitos: ['secret por provedor', 'janela de replay controlada'],
    antiBlockChecks: ['validar assinatura', 'persistir idempotency key', 'responder 2xx rapido e processar async'],
    envPrefix: 'WEBHOOK_CENTRAL',
  },
];

const normalizePrefix = (prefix: string) => prefix.replace(/-/g, '_').toUpperCase();

const getEnv = (provider: IntegrationProvider, key: string): string => {
  const prefix = normalizePrefix(provider.envPrefix);
  return process.env[`INTEGRACAO_${prefix}_${key}`] || '';
};

const getDefaultRedirectUri = (): string => {
  return process.env.INTEGRACAO_DEFAULT_REDIRECT_URI || 'http://localhost:3000/integracoes/callback';
};

const getFrontendBaseUrl = () => {
  return process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
};

const parseSegment = (segment?: string): IntegrationSegment => {
  if (!segment) return 'hub';
  const normalized = segment.toLowerCase();
  if (normalized === 'marketplaces' || normalized === 'gateways' || normalized === 'banks' || normalized === 'webhooks' || normalized === 'hub') {
    return normalized;
  }
  return 'hub';
};

const cleanupExpiredOauthStates = () => {
  const now = Date.now();
  for (const [state, data] of oauthStateStore.entries()) {
    if (now - data.createdAt > OAUTH_STATE_TTL_MS) {
      oauthStateStore.delete(state);
    }
  }
};

const getProviderById = (providerId: string) => {
  const provider = providers.find((item) => item.id === providerId);
  if (!provider) throw new Error('Provedor de integracao nao encontrado.');
  return provider;
};

const hashKey = (input: string) => crypto.createHash('sha256').update(input).digest();

const encryptSensitivePayload = (value: any) => {
  const raw = JSON.stringify(value || {});
  const secret = process.env.INTEGRACOES_ENCRYPTION_KEY || process.env.JWT_ACCESS_SECRET || 'salesmind-integracoes-default';
  const key = hashKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(raw, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

const getTokenValue = (payload: any, names: string[]) => {
  for (const name of names) {
    if (payload && typeof payload[name] === 'string' && payload[name]) {
      return payload[name];
    }
  }
  return '';
};

const inferExternalAccountId = (providerId: string, tokenPayload: any) => {
  const fromCommon = getTokenValue(tokenPayload, ['user_id', 'merchant_id', 'account_id', 'seller_id']);
  if (fromCommon) return String(fromCommon);
  if (providerId === 'shopify') {
    const scope = getTokenValue(tokenPayload, ['scope']);
    return scope ? `shopify-scope:${scope}` : 'shopify-account';
  }
  return `${providerId}-account`;
};

const inferScope = (tokenPayload: any) => {
  const scope = getTokenValue(tokenPayload, ['scope', 'scopes']);
  if (!scope) return null;
  return scope;
};

export class IntegracoesService {
  private async ensureStorageTable() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${STORAGE_TABLE} (
        id VARCHAR(191) PRIMARY KEY,
        user_id VARCHAR(191) NOT NULL,
        provider_id VARCHAR(80) NOT NULL,
        external_account_id VARCHAR(191) NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'CONECTADO',
        token_payload_enc TEXT NULL,
        scope VARCHAR(500) NULL,
        metadata_json TEXT NULL,
        connected_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        UNIQUE KEY uk_integracao_user_provider_account (user_id, provider_id, external_account_id)
      )
    `);
  }

  async listarContasIntegradas(userId: string) {
    await this.ensureStorageTable();
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, user_id, provider_id, external_account_id, status, scope, metadata_json, connected_at, updated_at
      FROM ${STORAGE_TABLE}
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `, userId);

    return rows.map((row) => {
      const provider = providers.find((p) => p.id === row.provider_id);
      return {
        id: row.id,
        userId: row.user_id,
        providerId: row.provider_id,
        providerName: provider?.nome || row.provider_id,
        externalAccountId: row.external_account_id,
        status: row.status,
        scope: row.scope,
        metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
        connectedAt: row.connected_at,
        updatedAt: row.updated_at,
      };
    });
  }

  private async upsertContaIntegrada(input: {
    userId: string;
    providerId: string;
    externalAccountId: string;
    tokenPayload: any;
    scope?: string | null;
    metadata?: Record<string, any>;
  }) {
    await this.ensureStorageTable();

    const id = crypto.randomUUID();
    const now = new Date();
    const encryptedPayload = encryptSensitivePayload(input.tokenPayload);
    const metadataJson = JSON.stringify(input.metadata || {});

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO ${STORAGE_TABLE}
      (id, user_id, provider_id, external_account_id, status, token_payload_enc, scope, metadata_json, connected_at, updated_at)
      VALUES (?, ?, ?, ?, 'CONECTADO', ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        token_payload_enc = VALUES(token_payload_enc),
        scope = VALUES(scope),
        metadata_json = VALUES(metadata_json),
        updated_at = VALUES(updated_at)
      `,
      id,
      input.userId,
      input.providerId,
      input.externalAccountId,
      encryptedPayload,
      input.scope || null,
      metadataJson,
      now,
      now
    );
  }

  listarStatus() {
    const data = providers.map((provider) => {
      const missing = this.getMissingRequirements(provider);
      return {
        id: provider.id,
        nome: provider.nome,
        segmento: provider.segmento,
        modo: provider.modo,
        configured: missing.length === 0,
        missing,
      };
    });

    const configuredCount = data.filter((item) => item.configured).length;
    return {
      total: data.length,
      configuredCount,
      pendingCount: data.length - configuredCount,
      providers: data,
    };
  }

  listarProviders(segment?: string) {
    const parsed = parseSegment(segment);
    const filtered = parsed === 'hub' ? providers : providers.filter((p) => p.segmento === parsed);

    return filtered.map((provider) => ({
      id: provider.id,
      nome: provider.nome,
      segmento: provider.segmento,
      modo: provider.modo,
      descricao: provider.descricao,
      docsUrl: provider.docsUrl,
      scopes: provider.scopes || [],
      requisitos: provider.requisitos,
      antiBlockChecks: provider.antiBlockChecks,
      webhookPath: provider.webhookPath,
      configured: this.getMissingRequirements(provider).length === 0,
      missing: this.getMissingRequirements(provider),
    }));
  }

  private getMissingRequirements(provider: IntegrationProvider) {
    if (provider.modo === 'oauth2_standard' || provider.modo === 'oauth2_shop_domain') {
      const missing: string[] = [];
      if (!getEnv(provider, 'CLIENT_ID')) missing.push('client_id');
      if (!getEnv(provider, 'CLIENT_SECRET')) missing.push('client_secret');
      if (!(getEnv(provider, 'REDIRECT_URI') || getDefaultRedirectUri())) missing.push('redirect_uri');
      return missing;
    }
    if (provider.modo === 'api_key') {
      const missing: string[] = [];
      if (!(getEnv(provider, 'API_KEY') || getEnv(provider, 'TOKEN'))) missing.push('api_key_ou_token');
      return missing;
    }
    return ['setup_manual'];
  }

  private isProviderConfigured(provider: IntegrationProvider) {
    return this.getMissingRequirements(provider).length === 0;
  }

  private createOauthState(providerId: string, metadata?: Record<string, string>) {
    cleanupExpiredOauthStates();
    const state = crypto.randomBytes(24).toString('hex');
    oauthStateStore.set(state, {
      providerId,
      createdAt: Date.now(),
      metadata,
    });
    return state;
  }

  validarOauthCallback(providerId: string, state?: string) {
    cleanupExpiredOauthStates();
    if (!state) {
      return {
        valid: false,
        reason: 'state_ausente',
      };
    }

    const entry = oauthStateStore.get(state);
    if (!entry) {
      return {
        valid: false,
        reason: 'state_invalido_ou_expirado',
      };
    }

    oauthStateStore.delete(state);
    if (entry.providerId !== providerId) {
      return {
        valid: false,
        reason: 'state_nao_corresponde_ao_provedor',
      };
    }

    return {
      valid: true,
      reason: 'ok',
      metadata: entry.metadata || {},
    };
  }

  gerarConnectUrl(providerId: string, params: { shopDomain?: string; userId?: string }) : ConnectUrlResult {
    const provider = getProviderById(providerId);

    if (provider.modo === 'manual') {
      return {
        providerId: provider.id,
        providerName: provider.nome,
        ready: false,
        url: provider.docsUrl,
        missing: ['setup_manual'],
        warning: 'Este provedor exige onboarding manual, certificacao ou requisitos externos antes do vinculo.',
      };
    }

    if (provider.modo === 'api_key') {
      return {
        providerId: provider.id,
        providerName: provider.nome,
        ready: this.getMissingRequirements(provider).length === 0,
        url: provider.docsUrl,
        missing: this.getMissingRequirements(provider),
        warning: 'Integracao por chave. Configure segredo de servidor e webhook antes de ativar sincronizacao.',
      };
    }

    const clientId = getEnv(provider, 'CLIENT_ID');
    const redirectUri = getEnv(provider, 'REDIRECT_URI') || getDefaultRedirectUri();
    const scope = getEnv(provider, 'SCOPE') || (provider.scopes || []).join(' ');
    const missing: string[] = [];

    if (!clientId) missing.push('client_id');
    if (!redirectUri) missing.push('redirect_uri');

    if (provider.modo === 'oauth2_shop_domain') {
      const shopDomain = (params.shopDomain || '').trim().toLowerCase();
      if (!shopDomain || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shopDomain)) {
        missing.push('shop_domain_valido');
      }

      const state = this.createOauthState(provider.id, {
        shopDomain,
        userId: params.userId || '',
      });
      const url = missing.length > 0
        ? provider.docsUrl
        : `https://${shopDomain}/admin/oauth/authorize?client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;

      return {
        providerId: provider.id,
        providerName: provider.nome,
        ready: missing.length === 0,
        url,
        missing,
        state,
        warning: 'Valide state e HMAC no callback para evitar bloqueio de seguranca.',
      };
    }

    const authorizationUrl = provider.authorizationUrl || provider.docsUrl;
    const state = this.createOauthState(provider.id, { userId: params.userId || '' });
    const url = missing.length > 0
      ? provider.docsUrl
      : `${authorizationUrl}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}${scope ? `&scope=${encodeURIComponent(scope)}` : ''}`;

    return {
      providerId: provider.id,
      providerName: provider.nome,
      ready: missing.length === 0,
      url,
      missing,
      state,
      warning: 'Use callback estatico com validacao de state/nonce para reduzir falhas de vinculo.',
    };
  }

  async testarAcesso(providerId: string) {
    const provider = getProviderById(providerId);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(provider.healthcheckUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });

      return {
        providerId: provider.id,
        providerName: provider.nome,
        url: provider.healthcheckUrl,
        reachable: true,
        status: response.status,
        ok: response.ok,
        note: response.ok
          ? 'Endpoint respondeu. Prosseguir com configuracao de credenciais e callback.'
          : 'Endpoint respondeu, porem com status nao-2xx. Verifique requisitos de autenticacao.',
      };
    } catch (error: any) {
      return {
        providerId: provider.id,
        providerName: provider.nome,
        url: provider.healthcheckUrl,
        reachable: false,
        status: null,
        ok: false,
        note: `Falha de conectividade: ${error?.message || 'erro desconhecido'}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async exchangeStandardOauth(provider: IntegrationProvider, code: string) {
    const clientId = getEnv(provider, 'CLIENT_ID');
    const clientSecret = getEnv(provider, 'CLIENT_SECRET');
    const redirectUri = getEnv(provider, 'REDIRECT_URI') || getDefaultRedirectUri();
    const tokenUrl = provider.tokenUrl;

    if (!tokenUrl) throw new Error('token_url_nao_configurada_para_provedor');
    if (!clientId || !clientSecret) throw new Error('credenciais_oauth_ausentes');

    const body = new URLSearchParams();
    body.set('grant_type', 'authorization_code');
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
    body.set('code', code);
    body.set('redirect_uri', redirectUri);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    const text = await response.text();
    let payload: any = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }

    if (!response.ok) {
      throw new Error(`oauth_exchange_failed_${response.status}`);
    }

    return payload;
  }

  private async exchangeShopifyOauth(provider: IntegrationProvider, code: string, metadata?: Record<string, string>) {
    const clientId = getEnv(provider, 'CLIENT_ID');
    const clientSecret = getEnv(provider, 'CLIENT_SECRET');
    const redirectUri = getEnv(provider, 'REDIRECT_URI') || getDefaultRedirectUri();
    const shopDomain = (metadata?.shopDomain || '').trim();

    if (!clientId || !clientSecret) throw new Error('credenciais_oauth_ausentes');
    if (!shopDomain || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shopDomain)) {
      throw new Error('shop_domain_invalido_para_exchange');
    }

    const tokenUrl = `https://${shopDomain}/admin/oauth/access_token`;
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`oauth_exchange_failed_${response.status}`);
    }

    return payload;
  }

  async processarCallbackOauth(providerId: string, params: {
    code?: string;
    state?: string;
    error?: string;
    errorDescription?: string;
  }): Promise<TokenExchangeResult> {
    const provider = getProviderById(providerId);

    if (params.error) {
      return {
        providerId,
        providerName: provider.nome,
        success: false,
        details: `${params.error}${params.errorDescription ? `: ${params.errorDescription}` : ''}`,
      };
    }

    if (!params.code) {
      return {
        providerId,
        providerName: provider.nome,
        success: false,
        details: 'code_ausente',
      };
    }

    const callbackValidation = this.validarOauthCallback(providerId, params.state);
    if (!callbackValidation.valid) {
      return {
        providerId,
        providerName: provider.nome,
        success: false,
        details: callbackValidation.reason,
      };
    }

    const userId = callbackValidation.metadata?.userId;
    if (!userId) {
      return {
        providerId,
        providerName: provider.nome,
        success: false,
        details: 'user_id_ausente_no_state',
      };
    }

    if (!(provider.modo === 'oauth2_standard' || provider.modo === 'oauth2_shop_domain')) {
      return {
        providerId,
        providerName: provider.nome,
        success: false,
        details: 'provedor_nao_suporta_exchange_oauth_automatico',
      };
    }

    try {
      const tokenPayload = provider.modo === 'oauth2_shop_domain'
        ? await this.exchangeShopifyOauth(provider, params.code, callbackValidation.metadata)
        : await this.exchangeStandardOauth(provider, params.code);

      const externalAccountId = inferExternalAccountId(providerId, tokenPayload);
      const scope = inferScope(tokenPayload);

      await this.upsertContaIntegrada({
        userId,
        providerId,
        externalAccountId,
        tokenPayload,
        scope,
        metadata: {
          callbackStateValidated: true,
          shopDomain: callbackValidation.metadata?.shopDomain || null,
        },
      });

      return {
        providerId,
        providerName: provider.nome,
        success: true,
        accountId: externalAccountId,
        details: 'token_exchange_e_persistencia_realizados',
      };
    } catch (error: any) {
      return {
        providerId,
        providerName: provider.nome,
        success: false,
        details: error?.message || 'falha_no_exchange',
      };
    }
  }

  callbackRedirectUrl(result: TokenExchangeResult) {
    const frontendBase = getFrontendBaseUrl().replace(/\/$/, '');
    const status = result.success ? 'sucesso' : 'erro';
    const details = encodeURIComponent(result.details || '');
    const provider = encodeURIComponent(result.providerId);
    const accountId = encodeURIComponent(result.accountId || '');
    return `${frontendBase}/?integracaoCallback=1&status=${status}&provider=${provider}&accountId=${accountId}&details=${details}`;
  }

  webhookTemplates(baseUrl: string) {
    return providers
      .filter((provider) => provider.webhookPath)
      .map((provider) => ({
        providerId: provider.id,
        providerName: provider.nome,
        webhookUrl: `${baseUrl}${provider.webhookPath}`,
      }));
  }
}

const integracoesService = new IntegracoesService();
export default integracoesService;
