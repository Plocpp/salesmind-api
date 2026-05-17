# Operação de Produção, Go-Live e Rollback

Este guia descreve como colocar o SalesMind online com segurança e como voltar rapidamente para uma versão estável em caso de incidente.

## 1) Fluxo oficial de publicação

1. Desenvolver em branch de feature.
2. Abrir Pull Request para `main` ou `master`.
3. Aguardar pipeline de validação passar:
   - `.github/workflows/pre-deploy-validation.yml`
4. Fazer merge.
5. Deploy automático roda via:
   - `.github/workflows/deploy-online.yml`
6. Confirmar publicação da imagem no GHCR.
7. Atualizar ambiente de execução (servidor/cluster) para a nova tag.
8. Validar saúde e smoke pós-deploy.

## 2) Variáveis de ambiente de produção

Modelos prontos no repositorio:

- `.env.production.example`
- `.env.frontend.production.example`

## Padrao de endereco recomendado (sepeguiado)

- Frontend: `https://app.sepeguiado.com.br`
- API: `https://api.sepeguiado.com.br`

Mapeamento de variaveis:

- `FRONTEND_BASE_URL=https://app.sepeguiado.com.br`
- `PUBLIC_BASE_URL=https://api.sepeguiado.com.br`

## Obrigatórias

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ONBOARDING_WEBHOOK_TOKEN`

## Recomendadas

- `NODE_ENV=production`
- `PORT=3000` (ou porta do ambiente)
- `PUBLIC_BASE_URL` (URL pública da API)
- `FRONTEND_BASE_URL` (URL pública do frontend)
- `INTEGRACOES_ENCRYPTION_KEY`

## Hardening de API (recomendado)

- `TRUST_PROXY=1` (quando atras de proxy/reverse proxy)
- `JSON_BODY_LIMIT=1mb`
- `RATE_LIMIT_MAX_GLOBAL=600`
- `RATE_LIMIT_MAX_AUTH=60`
- `CORS_ORIGIN_ALLOWLIST=https://app.sepeguiado.com.br`

## Hardening de autenticacao (recomendado)

- `PASSWORD_MIN_LENGTH=10`
- `LOGIN_MAX_ATTEMPTS_BASE=5`
- `LOGIN_FAILURE_WINDOW_MINUTES=30`
- `LOGIN_BLOCK_MINUTES_BASE=10`
- `LOGIN_BLOCK_MULTIPLIER=2`
- `LOGIN_BLOCK_MAX_MINUTES=120`

Comportamento:

- tentativas invalidas de login sao auditadas em tabela dedicada.
- bloqueio temporario e progressivo por email em caso de abuso.
- respostas de login evitam distinguir email inexistente de senha incorreta.

## E-mail

- `EMAIL_MOCK_MODE=false` em produção
- `EMAIL_PROVIDER` (exemplo: `outlook`)
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE`

## 3) Checklist pré-go-live

1. Banco atualizado:
   - `npx prisma db push`
   - `npm run seed` (somente se o ambiente exigir dados-base)
2. API local validada com:
   - `npm run test:smoke`
3. Fluxo onboarding validado com:
   - `npm run test:onboarding-acesso`
4. Build validado com:
   - `npm run build:all`
5. Pipelines verdes no GitHub Actions.
6. Segredos preenchidos no ambiente alvo.

## 4) Validação pós-deploy (obrigatória)

1. Verificar health:
   - `GET /health`
2. Verificar diagnóstico:
   - `GET /diagnostico/saude`
3. Executar smoke no ambiente recém-publicado apontando base URL:
   - `SMOKE_BASE_URL=https://api.sepeguiado.com.br npm run test:smoke`
4. Validar login, vendas, financeiro e onboarding com conta de homologação.

## 5) Rollback operacional

Quando aplicar rollback:
- aumento de erro 5xx
- login indisponível
- falha em venda/caixa
- inconsistência crítica de dados

Passos:
1. Selecionar a última imagem estável no GHCR (tag anterior).
2. Reapontar o runtime para essa tag.
3. Reiniciar serviço da API.
4. Validar:
   - `GET /health`
   - `GET /diagnostico/saude`
   - `npm run test:smoke` contra ambiente publicado
5. Registrar incidente e causa raiz.

## 6) Estratégia de mudança de banco

1. Preferir alterações compatíveis com versão anterior da API.
2. Evitar mudanças destrutivas no mesmo deploy da mudança funcional.
3. Se houver risco de breaking change:
   - primeiro deploy: compatibilidade dupla
   - segundo deploy: remoção de legado após validação
4. Em produção, toda mudança de schema deve ter plano de reversão.

## 7) Responsabilidades

- Dev responsável pela feature: entrega código + checklist preenchido.
- Revisor técnico: valida riscos de regressão e cobertura de testes.
- Responsável por release: aprova deploy após validação completa.

## 8) Evidências mínimas por release

- Link da PR
- Link da execução da pipeline de validação
- Link da execução da pipeline de deploy
- Resultado do smoke pós-deploy
- Registro de versão/tag implantada
