# SaaS Multiempresa - Cadastro via Pagamento

## Objetivo

Habilitar venda da plataforma para varias empresas com onboarding self-service:

1. cliente escolhe plano
2. inicia pre-cadastro com consentimento LGPD
3. segue para checkout de assinatura
4. webhook confirma pagamento
5. sistema provisiona empresa + usuario admin

## Endpoints do modulo

- GET `/onboarding/planos`
- GET `/onboarding/preferencias`
- POST `/onboarding/cadastro`
- GET `/onboarding/status/:id`
- POST `/onboarding/webhooks/pagamento`
- GET `/onboarding/mock-checkout/:id` (desenvolvimento)

## Payload de cadastro

```json
{
  "empresaNome": "Pet Shop XPTO",
  "empresaCnpj": "12.345.678/0001-90",
  "adminNome": "Ana Gestora",
  "adminEmail": "ana@xpto.com",
  "adminSenha": "senha-forte",
  "planoId": "starter",
  "providerPreferido": "ASAAS",
  "pais": "BR",
  "moeda": "BRL",
  "precisaPix": true,
  "finalidade": "contratacao da plataforma para operacao de vendas",
  "baseLegal": "execucao_de_contrato",
  "consentimentoLgpd": true
}
```

## Regras LGPD aplicadas

- consentimento explicito obrigatorio
- finalidade obrigatoria
- base legal obrigatoria
- trilha de auditoria de onboarding/pagamento/provisionamento
- provisionamento de acesso apenas apos pagamento confirmado

## Preferencias de gateway (com base em documentacao oficial)

### Brasil com PIX e recorrencia
1. Asaas
2. Mercado Pago
3. Stripe
4. PayPal

### Brasil com foco em cartao e link de assinatura
1. Mercado Pago
2. Asaas
3. Stripe
4. PayPal

### Internacional (USD)
1. Stripe
2. PayPal
3. Mercado Pago
4. Asaas

## Referencias pesquisadas

- Stripe Checkout Subscriptions: https://docs.stripe.com/payments/checkout/build-subscriptions
- PayPal Subscriptions: https://developer.paypal.com/docs/subscriptions/
- Mercado Pago Subscriptions: https://www.mercadopago.com.br/developers/pt/docs/subscriptions/overview
- Asaas Assinaturas: https://docs.asaas.com/docs/assinaturas

## Variaveis de ambiente esperadas

- `ONBOARDING_WEBHOOK_TOKEN`
- `PUBLIC_BASE_URL`

Links de checkout por plano/provedor:

- `SAAS_CHECKOUT_LINK_ASAAS_STARTER`
- `SAAS_CHECKOUT_LINK_ASAAS_GROWTH`
- `SAAS_CHECKOUT_LINK_ASAAS_SCALE`
- `SAAS_CHECKOUT_LINK_MERCADO_PAGO_STARTER`
- `SAAS_CHECKOUT_LINK_MERCADO_PAGO_GROWTH`
- `SAAS_CHECKOUT_LINK_MERCADO_PAGO_SCALE`
- `SAAS_CHECKOUT_LINK_STRIPE_STARTER`
- `SAAS_CHECKOUT_LINK_STRIPE_GROWTH`
- `SAAS_CHECKOUT_LINK_STRIPE_SCALE`
- `SAAS_CHECKOUT_LINK_PAYPAL_STARTER`
- `SAAS_CHECKOUT_LINK_PAYPAL_GROWTH`
- `SAAS_CHECKOUT_LINK_PAYPAL_SCALE`

## Observacao tecnica

Quando os links nao estao configurados, o sistema usa `mock-checkout` para testes internos e homologacao de fluxo.
