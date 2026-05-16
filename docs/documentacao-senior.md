# Documentacao Tecnica Senior - SalesMind

## Objetivo
Esta documentacao consolida o contexto tecnico e operacional para manutencao de longo prazo do sistema.

Escopo:
- Backend Node.js + Express + TypeScript + Prisma
- Frontend React + Vite
- Banco MySQL
- Fluxos de vendas, caixa, estoque, financeiro e diagnostico

## Contexto de Arquitetura
## Visao de componentes
- API principal: src/app.ts + src/server.ts
- Modulos HTTP por dominio: src/routes
- Camada de negocio: src/services
- Controladores: src/controllers
- Persistencia: src/database/prisma.ts + prisma/schema.prisma
- Frontend: src/frontend

## Pilares de arquitetura atuais
- Separacao entre controller e service para reduzir acoplamento HTTP/regra
- Prisma como camada de acesso e evolucao de schema via migrations
- JWT para autenticacao e autorizacao basica por role
- Error handling centralizado com middleware e modulo de diagnostico

## Convencoes de Desenvolvimento
## Backend
- Controller:
  - valida entrada minima de request
  - delega regra para service
  - retorna status HTTP e payload
- Service:
  - contem regra de negocio e integridade de fluxo
  - usa validacao com Zod para payloads externos
  - nao deve depender de objetos de UI
- Prisma:
  - toda alteracao de schema deve virar migration versionada
  - evitar queries em campos ainda nao migrados

## Frontend
- Componentes de pagina em src/frontend/pages
- Cliente HTTP central em src/frontend/services/api.ts
- Token em localStorage, com envio em Authorization Bearer

## Operacao e Ambiente
## Comandos principais
- Instalar dependencias: npm install
- Executar API: npm run dev
- Executar frontend: npm run dev:frontend
- Validar tipos: npx tsc --noEmit
- Deploy migrations: npx prisma migrate deploy
- Seed: npm run seed

## Endpoints operacionais
- Health: GET /health
- Diagnostico:
  - GET /diagnostico/saude
  - GET /diagnostico/erros
  - GET /diagnostico/relatorio

## Definicao de pronto para mudancas criticas
- Regra nova validada em service com cenarios de erro e sucesso
- Migration aplicada e revisada quando houver alteracao de schema
- Fluxo principal testado manualmente ponta a ponta
- Erros de tipagem zerados

## Seguranca e Governanca Tecnica
- Segredos apenas via .env
- Tokens com expiracao curta para access token
- Nao registrar dados sensiveis em logs
- Diagnostico sem vazar credenciais, token ou stack em producao

## Riscos tecnicos atuais
- Ausencia de suite automatizada de testes regressivos
- Ausencia de padrao unico de observabilidade (tracing/metrica)
- Ausencia de padrao de mascaramento de PII em logs

## Plano tecnico sugerido (90 dias)
1. Cobertura minima de testes em auth, vendas e caixa
2. Politica de logs com redacao de PII
3. Versionamento de API (contrato) para mudancas criticas
4. Hardening de headers HTTP e CORS por ambiente
5. Adequacao LGPD operacional conforme docs/lgpd-programa-adequacao.md

## Gestao de conhecimento
- Toda mudanca arquitetural relevante deve ser registrada em docs com data, motivo e impacto.
- Evitar conhecimento tacito: se um workaround foi necessario, documentar imediatamente.

## Referencias internas
- README.md
- SISTEMA_ERROR_REPORTING.md
- docs/modulo-financeiro.md
- docs/modulo-estoque-servicos.md
- docs/lgpd-programa-adequacao.md
