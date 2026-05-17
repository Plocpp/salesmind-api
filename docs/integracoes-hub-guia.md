# Integracoes e HUB - guia senior

## Objetivo

Este modulo centraliza o onboarding de integracoes para marketplaces, gateways de pagamento, bancos/Open Finance e webhooks, com foco em reduzir bloqueios de vinculacao futuros.

## Cobertura inicial de plataformas

- Marketplaces: Mercado Livre, Shopify, Amazon SP-API, Nuvemshop, WooCommerce, VTEX
- Gateways: Mercado Pago, Stripe, PayPal, Asaas
- Bancos/Open Finance: Open Finance Brasil (onboarding manual)
- Hub de eventos: endpoint central de webhooks por provedor

## Endpoints implementados

- GET `/integracoes/providers?segment=hub|marketplaces|gateways|banks|webhooks`
- GET `/integracoes/status`
- GET `/integracoes/providers/:providerId/connect-url`
- POST `/integracoes/providers/:providerId/test`
- GET `/integracoes/accounts`
- GET `/integracoes/callback/:providerId`
- GET `/integracoes/webhooks/templates`

Obs.: o callback OAuth e publico para receber redirecionamento dos provedores.

## Variaveis de ambiente

Padrao de nome para provedores:

- `INTEGRACAO_<PROVIDER_PREFIX>_CLIENT_ID`
- `INTEGRACAO_<PROVIDER_PREFIX>_CLIENT_SECRET`
- `INTEGRACAO_<PROVIDER_PREFIX>_REDIRECT_URI`
- `INTEGRACAO_<PROVIDER_PREFIX>_SCOPE`
- `INTEGRACAO_<PROVIDER_PREFIX>_API_KEY`
- `INTEGRACAO_<PROVIDER_PREFIX>_TOKEN`

Variavel global:

- `INTEGRACAO_DEFAULT_REDIRECT_URI` (fallback para OAuth)
- `PUBLIC_BASE_URL` (base para webhooks/templates)
- `FRONTEND_BASE_URL` (redirecionamento do callback para UI)
- `INTEGRACOES_ENCRYPTION_KEY` (criptografia local do payload de token)

Arquivo de apoio:

- `.env.integracoes.example` com todas as chaves por provedor

Exemplos:

- `INTEGRACAO_MERCADO_LIVRE_CLIENT_ID=...`
- `INTEGRACAO_SHOPIFY_CLIENT_ID=...`
- `INTEGRACAO_SHOPIFY_REDIRECT_URI=https://api.seudominio.com/integracoes/callback/shopify`
- `INTEGRACAO_STRIPE_API_KEY=sk_live_...`

## Regras anti-bloqueio adotadas

- Redirect URI estatico e validado por provedor
- Uso de `state`/nonce em geracao de URL OAuth
- Validacao de `state` com expiração (callback OAuth)
- Callback OAuth com troca automatica de `code` por token nos provedores suportados
- Persistencia de contas integradas por usuario (status e metadados)
- Recomendacao de validacao de assinatura de webhook
- Recomendacao de idempotencia para operacoes financeiras
- Teste tecnico de conectividade por host de referencia

## Limites conhecidos

- O modulo nao persiste credenciais em banco por seguranca; usa variaveis de ambiente
- Alguns provedores (ex.: Amazon SP-API e Open Finance) exigem onboarding manual, papeis, certificacoes ou passos fora do escopo automatico
- O teste de acesso atual valida conectividade do host, nao autorizacao final de API

## Proximos passos recomendados

1. Persistir status de vinculacao (tenant/provedor) em tabela dedicada e auditar eventos.
2. Implementar callback OAuth por provedor com validacao de `state`, `hmac`/assinatura e rotacao de tokens.
3. Implementar fila assicrona para recebimento de webhooks (ack rapido + processamento posterior).
4. Incluir testes E2E por sandbox (Mercado Livre, Shopify, Stripe, PayPal).
