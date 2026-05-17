# Checklist de Publicacao na Internet (Qualquer Maquina)

Este guia e o procedimento sequencial para deixar o sistema publico e testavel de fora da rede local.

Referencia complementar de dominio e certificado:

- `docs/dns-e-ssl-sepeguiado.md`

## Padrao de endereco recomendado (sepeguiado)

Use o nome sepeguiado como base para reduzir ambiguidade entre frontend e API:

- Frontend: `https://app.sepeguiado.com.br`
- API: `https://api.sepeguiado.com.br`
- Health: `https://api.sepeguiado.com.br/health`

Configuracoes essenciais:

- no frontend (`.env.frontend`): `VITE_API_BASE_URL=https://api.sepeguiado.com.br`
- no backend (`.env`): `FRONTEND_BASE_URL=https://app.sepeguiado.com.br`
- no backend (`.env`): `PUBLIC_BASE_URL=https://api.sepeguiado.com.br`

## 1) Preparacao local

1. Instalar dependencias:
   - `npm install`
2. Configurar backend (`.env`):
   - `DATABASE_URL`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `ONBOARDING_WEBHOOK_TOKEN`
   - `TRUST_PROXY`, `RATE_LIMIT_MAX_GLOBAL`, `RATE_LIMIT_MAX_AUTH`, `CORS_ORIGIN_ALLOWLIST`
3. Configurar frontend (`.env.frontend`):
   - copiar de `.env.frontend.example`
   - ajustar `VITE_API_BASE_URL` para a URL publica da API

## 2) Validacao tecnica obrigatoria

1. Banco e seed:
   - `npx prisma db push`
   - `npm run seed`
2. Build:
   - `npm run build` (frontend)
   - `npm run build:api` (quando o backend estiver sem pendencias de tipagem)
3. Smoke:
   - `npm run test:smoke`
4. Onboarding:
   - `npm run test:onboarding-acesso`

## 3) Publicacao automatica no repositorio

1. Abrir PR para `main`/`master`.
2. Confirmar pipeline:
   - `.github/workflows/pre-deploy-validation.yml`
3. Merge.
4. Confirmar deploy:
   - `.github/workflows/deploy-online.yml`
5. Confirmar imagem no GHCR.

## 4) Subida em servidor/host

1. Definir variaveis de ambiente de producao no host.
2. Publicar imagem mais recente do GHCR.
3. Expor porta da API via dominio HTTPS.
4. Publicar frontend com `VITE_API_BASE_URL` apontando para API publica.
5. Confirmar hardening ativo: headers de seguranca, CORS restrito e rate limit.

### Modo de subida imediata da API

Se o build estrito da API falhar por tipagens legadas, subir com runtime transpile-only:

- comando de start no host/container: `npm run start:runtime`

## 5) Teste externo (internet)

1. De uma rede externa (4G/outro computador), validar:
   - `GET /health`
   - login
   - criacao de cliente no PDV
   - finalizacao de venda
2. Rodar smoke apontando para API publica:
   - `SMOKE_BASE_URL=https://api.sepeguiado.com.br npm run test:smoke`

## 6) Rollback rapido

1. Reverter para a tag anterior da imagem no host.
2. Reiniciar servico.
3. Validar `GET /health` e smoke minimo.
4. Registrar incidente e causa raiz.
