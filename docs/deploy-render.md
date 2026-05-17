# Deploy no Render (API + Frontend)

Este guia coloca o SalesMind online no Render com menor complexidade.

## 1. O que ja esta pronto

- Blueprint Render no arquivo `render.yaml`.
- API com health check em `/health`.
- Frontend buildando pelo comando `npm run build` (Vite com root em `src/frontend`).

## 2. Ponto importante: banco de dados

O Prisma esta configurado para **MySQL** (`prisma/schema.prisma`).
O Render nao oferece MySQL gerenciado nativamente no mesmo nivel de simplicidade do Postgres.

Use uma opcao externa de MySQL e preencha `DATABASE_URL` no Render:

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

## 5. Migracao e seed

O blueprint ja executa `npx prisma db push` no pre-deploy da API.

Se precisar popular dados base, rode uma vez no shell do servico API:

```bash
npm run seed
```

## 6. Validacao pos deploy

1. API health:
   - `GET https://<api-url>/health`
2. Diagnostico:
   - `GET https://<api-url>/diagnostico/saude`
3. Smoke remoto (localmente, apontando para API publica):

```bash
SMOKE_BASE_URL=https://<api-url> npm run test:smoke
```

## 7. Observacao sobre performance

Para producao inicial, use plano `starter` para a API (evita cold-start severo).
Se o trafego crescer, aumente plano da API e mantenha frontend static no plano free/starter.
