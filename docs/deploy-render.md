# Deploy no Render (API + Frontend)

Este guia coloca o SalesMind online no Render com menor complexidade.

## 1. O que ja esta pronto

- Blueprint Render no arquivo `render.yaml`.
- API com health check em `/health`.
- Frontend buildando pelo comando `npm run build` (Vite com root em `src/frontend`).

## 2. Ponto importante: banco de dados

O Prisma esta configurado para **MySQL** (`prisma/schema.prisma`).
O Render nao oferece MySQL gerenciado nativamente no mesmo nivel de simplicidade do Postgres.

Use uma opcao externa de MySQL e preencha `DATABASE_URL` no Render.
Se a URL vier com host interno do Railway (`*.railway.internal`), configure tambem `DATABASE_URL_PUBLIC` (ou `MYSQL_PUBLIC_URL`) para acesso externo:

- PlanetScale
- Railway MySQL
- Aiven MySQL
- MySQL proprio em VPS

## 3. Publicacao no Render (Blueprint)

1. Suba este repositorio no GitHub com `render.yaml`.
2. No Render: **New +** -> **Blueprint**.
3. Conecte o repositorio e confirme os 2 servicos:
   - `salesmind-api`
   - `salesmind-app`
4. Preencha os secrets obrigatorios da API:
   - `DATABASE_URL`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `ONBOARDING_WEBHOOK_TOKEN`
   - `INTEGRACOES_ENCRYPTION_KEY`
   - `EMAIL_FROM`
   - `SMTP_USER`
   - `SMTP_PASS`

Se quiser enviar códigos de ativação por telefone em produção, também configure:
   - `PHONE_MOCK_MODE=false`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_SMS_FROM`
   - `TWILIO_WHATSAPP_FROM`

5. Clique em **Apply** para criar os servicos.

## 4. Ajustes apos primeiro deploy

Depois que o Render gerar as URLs finais, atualize:

- API:
  - `FRONTEND_BASE_URL`
  - `CORS_ORIGIN_ALLOWLIST`
  - `PUBLIC_BASE_URL`
- Frontend:
  - `VITE_API_BASE_URL`

Use as URLs reais `*.onrender.com` criadas no seu ambiente.

## 4.1 Deploy totalmente automatico (GitHub Actions + Render)

Este repositorio ja possui workflow de deploy em [salesmind-api/.github/workflows/deploy-online.yml](.github/workflows/deploy-online.yml), que agora:

- publica a imagem da API no GHCR
- aciona deploy da API no Render (hook)
- aciona deploy do frontend no Render (hook)

Para funcionar sem etapas manuais, configure estes secrets no GitHub (Settings -> Secrets and variables -> Actions):

- `RENDER_API_DEPLOY_HOOK`
- `RENDER_APP_DEPLOY_HOOK`

Onde encontrar os hooks no Render:

1. Abra o servico no Render.
2. Acesse **Settings** -> **Deploy Hook**.
3. Crie/copiei a URL do hook.
4. Salve no secret correspondente no GitHub.

Depois disso, basta rodar o workflow **Deploy Online** manualmente (workflow_dispatch) ou deixar ele seguir automaticamente apos o **Pre-Deploy Validation**.

## 4.1 Monitoramento automatico pos-deploy

Agora o repositório inclui o workflow **Post-Deploy Monitor** (`.github/workflows/post-deploy-monitor.yml`), acionado apos o **Deploy Online** com:

- health check com retry da API
- check de diagnostico (`/diagnostico/saude`)
- validacao da rota protegida de hierarquia (`/acessos/hierarquia/perfis` retornando 401/403 sem token)
- check basico do frontend (`salesmind-app`)
- alerta opcional via webhook quando a verificacao falha

Secrets/vars opcionais para monitoramento:

- `ALERT_WEBHOOK_URL` (secret)
- `SMOKE_USER_EMAIL` (secret, para smoke autenticado pos-deploy)
- `SMOKE_USER_PASSWORD` (secret, para smoke autenticado pos-deploy)
- `API_BASE_URL` (variable, default `https://salesmind-api.onrender.com`)
- `APP_BASE_URL` (variable, default `https://salesmind-app.onrender.com`)
- `POST_DEPLOY_MAX_ATTEMPTS` (variable, default `20`)
- `POST_DEPLOY_RETRY_DELAY_MS` (variable, default `15000`)

## 5. Migracao e seed

Para evitar falhas de deploy por indisponibilidade temporaria de banco, o build da API no Render nao executa mais comandos que dependem de conexao com banco.

Quando for necessario aplicar schema/dados, execute manualmente no Shell do servico API (com o banco online):

```bash
npx prisma db push
```

Se precisar popular dados base, rode em seguida:

```bash
npm run seed
```

## 6. Validacao pos deploy

1. API health:
   - `GET https://<api-url>/health`
2. Diagnostico:
   - `GET https://<api-url>/diagnostico/saude`
3. Smoke remoto (localmente, apontando para API publica):

Linux/macOS:

```bash
SMOKE_BASE_URL=https://<api-url> npm run test:smoke
```

Windows (cmd):

```bat
set SMOKE_BASE_URL=https://<api-url> && npm run test:smoke
```

## 7. Observacao sobre performance

Para producao inicial, use plano `starter` para a API (evita cold-start severo).
Se o trafego crescer, aumente plano da API e mantenha frontend static no plano free/starter.

## 8. Checklist rapido de execucao (Render)

Status validado nesta sessao (17/05/2026):

- [x] `render.yaml` com 2 servicos (`salesmind-api` e `salesmind-app`)
- [x] `healthCheckPath` da API em `/health`
- [x] `npm run release:check` verde (smoke 44/44 + build frontend)
- [x] `npm run build:api` verde
- [x] Build da API sem dependencia de banco (`npm ci && npx prisma generate`)
- [ ] Secrets obrigatorios preenchidos no Render (`DATABASE_URL`, `JWT_*`, `ONBOARDING_WEBHOOK_TOKEN`, `INTEGRACOES_ENCRYPTION_KEY`, `EMAIL_FROM`, `SMTP_USER`, `SMTP_PASS`)
- [ ] Revisar URLs finais dos servicos e atualizar: `FRONTEND_BASE_URL`, `CORS_ORIGIN_ALLOWLIST`, `PUBLIC_BASE_URL`, `VITE_API_BASE_URL`
- [ ] Rodar smoke remoto contra URL publica da API

Comandos finais de validacao externa:

Validacao de primeiro acesso (onboarding + login + smoke):

```bash
npm run test:first-access-ready
```

Para incluir builds no mesmo comando:

Linux/macOS:

```bash
FIRST_ACCESS_INCLUDE_BUILDS=1 npm run test:first-access-ready
```

Windows (cmd):

```bat
set FIRST_ACCESS_INCLUDE_BUILDS=1 && npm run test:first-access-ready
```

Para validar diretamente no ambiente publicado (sem subir servidor local):

Linux/macOS:

```bash
FIRST_ACCESS_BASE_URL=https://<api-url> npm run test:first-access-ready
```

Windows (cmd):

```bat
set FIRST_ACCESS_BASE_URL=https://<api-url> && npm run test:first-access-ready
```

Linux/macOS:

```bash
SMOKE_BASE_URL=https://<api-url> npm run test:smoke
```

Windows (cmd):

```bat
set SMOKE_BASE_URL=https://<api-url> && npm run test:smoke
```
