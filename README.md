# SalesMind API + Frontend

Sistema de gestão de vendas e estoque para pet shop, com backend em Node.js + Express + TypeScript + Prisma e frontend em React + Vite.

## Visão geral

- Backend: `src/`
- Frontend: `src/frontend/`
- Banco de dados: Prisma + MySQL
- Autenticação: JWT
- Papéis de usuário: `ADMIN`, `GERENTE`, `VENDEDOR`, `CAIXA`, `ESTOQUISTA`, `USER`

## Como executar

1. Instale dependências:
   ```bash
   npm install
   ```

2. Configure o arquivo `.env` na raiz com a variável:
   ```env
   DATABASE_URL="mysql://user:password@localhost:3306/nome_do_banco"
   ```

3. Rode as migrations e popule dados de exemplo:
   ```bash
   npx prisma migrate deploy
   npm run seed
   ```

4. Inicie o backend:
   ```bash
   npm run dev
   ```

5. Inicie o frontend:
   ```bash
   npm run dev:frontend
   ```

> O frontend usa Vite com root em `src/frontend`, e consome a API em `http://localhost:3000`.
> Para qualquer maquina/ambiente, configure `VITE_API_BASE_URL` usando `.env.frontend.example`.

### Endereco recomendado para publicacao

- Frontend: `https://app.sepeguiado.com.br`
- API: `https://api.sepeguiado.com.br`
- Health: `https://api.sepeguiado.com.br/health`

Arquivos prontos para producao:

- Backend: `.env.production.example`
- Frontend: `.env.frontend.production.example`
- DNS/SSL: `docs/dns-e-ssl-sepeguiado.md`

Controles de seguranca ativos no backend:

- `helmet` para headers HTTP de seguranca
- CORS restrito por allowlist em producao
- rate limiting global e reforcado em `/auth`
- limite de payload JSON configuravel por ambiente

## Passos corretos antes de colocar online

1. Sincronizar banco e dados base:
   ```bash
   npx prisma db push
   npm run seed
   ```

2. Subir backend:
   ```bash
   npm run dev
   ```

3. Rodar smoke test completo por módulo:
   ```bash
   npm run test:smoke
   ```

4. Rodar E2E de onboarding + código de acesso:
   ```bash
   npm run test:onboarding-acesso
   ```

5. Validar build do frontend:
   ```bash
   npm run build
   ```

6. Em PR/push para `main` e `master`, a pipeline também valida automaticamente em:
   - `.github/workflows/pre-deploy-validation.yml`

## Deploy online com gate obrigatório

- Pipeline de validação: `.github/workflows/pre-deploy-validation.yml`
- Pipeline de deploy: `.github/workflows/deploy-online.yml`

O deploy online só executa quando:
1. A validação pré-deploy concluir com sucesso (gatilho automático), ou
2. Você disparar manualmente via `workflow_dispatch`.

### Artefato publicado

- Imagem Docker da API no GHCR:
   - `ghcr.io/<owner>/<repo>/salesmind-api:latest`
   - `ghcr.io/<owner>/<repo>/salesmind-api:sha-...`

### Deploy simples no Render

- Blueprint pronto em `render.yaml` (API + frontend)
- Guia rapido: `docs/deploy-render.md`
- Observacao: este projeto usa MySQL no Prisma, entao configure `DATABASE_URL` para um MySQL externo no Render.

### Rodar em produção localmente (modo API)

```bash
npm run build:api
npm run start:prod
```

### Rodar API em produção imediata (runtime transpile-only)

Use quando houver pendências de tipagem em módulos legados e você precisar publicar sem bloquear operação:

```bash
npm run start:runtime
```

### Build de produção completo (API + frontend)

```bash
npm run build:all
```

> Status atual: o build estrito de TypeScript da API esta passando (`npm run build:api`). O deploy continua usando `start:runtime` para priorizar robustez operacional em runtime no ambiente de producao.

## Estrutura principal

### Backend

- `src/server.ts` – servidor Express que inicia a aplicação.
- `src/app.ts` – registrador de middlewares e rotas.
- `src/routes/` – rotas agrupadas por domínio:
  - `auth.routes.ts`
  - `produto.routes.ts`
  - `fornecedores.routes.ts`
  - `vendas.routes.ts`
- `src/services/` – lógica de negócio:
  - `produto.service.ts`
  - `fornecedores.service.ts`
  - `vendas.service.ts`
- `src/controllers/` – controllers HTTP.
- `src/database/prisma.ts` – cliente Prisma.
- `prisma/schema.prisma` – modelo de dados.

### Frontend

- `src/frontend/App.tsx` – roteamento de páginas e navegação.
- `src/frontend/services/api.ts` – cliente HTTP centralizado com suporte a token.
- `src/frontend/pages/` – páginas React:
  - `CadastroProdutos.tsx` – cadastro, edição e lista de produtos + sugestões de compras.
  - `Fornecedores.tsx` – gerenciar fornecedores.
  - `Marcas.tsx` – gerenciar marcas.
  - `Vendas.tsx` – fluxo de vendas.
  - `Dashboard.tsx` – visão geral e métricas.
  - `Login.tsx` – autenticação.

## Rotas de API importantes

### Autenticação
- `POST /auth/login` – faz login e retorna token JWT.
- `POST /auth/register` – cria novo usuário.

### Produtos
- `GET /produtos` – lista produtos autorizados para o usuário.
- `POST /produtos` – cria produto novo.
- `PUT /produtos/:id` – atualiza produto.
- `DELETE /produtos/:id` – exclui produto.

### Cadastros administrativos
- `GET /cadastros/fornecedores`
- `POST /cadastros/fornecedores`
- `PUT /cadastros/fornecedores/:id`
- `DELETE /cadastros/fornecedores/:id`
- `GET /cadastros/marcas`
- `POST /cadastros/marcas`
- `PUT /cadastros/marcas/:id`
- `DELETE /cadastros/marcas/:id`
- `GET /cadastros/produtos`
- `POST /cadastros/produtos`
- `PUT /cadastros/produtos/:id`
- `DELETE /cadastros/produtos/:id`

### Vendas
- `POST /vendas/clientes` – cria cliente para venda.
- `GET /vendas/clientes/buscar` – busca cliente por telefone ou email.
- `GET /vendas/produtos/buscar` – busca produto por nome, código ou código de barras.
- `POST /vendas/vendas` – registra venda.

## Como o cadastro de produtos funciona

A página `src/frontend/pages/CadastroProdutos.tsx` foi construída para:

- exibir produtos cadastrados
- criar novo produto
- editar produto existente
- excluir produto
- escolher marca vinculada a fornecedor
- mostrar painéis de sugestões de compra para:
  - estoque baixo
  - validade próxima
  - produtos de alto giro (simulado)

## Notas importantes para o próximo desenvolvedor

- `src/server.ts` importa `src/app.ts`; todas as rotas são centralizadas em `app.ts`.
- O frontend depende de `localStorage.token` para enviar o token JWT em cada requisição.
- A lista de produtos retorna também `marca` e `marca.fornecedor` para exibir nome do fornecedor na UI.
- Se adicionar novas rotas, registre em `src/app.ts` e mantenha os controllers e services separados por responsabilidade.

## Sugestões de melhoria futura

- adicionar validação de schema no frontend com `Zod` ou `Yup`
- implementar paginação e filtros de produto na API
- adicionar testes unitários e de integração
- refatorar componentes React para usar `Context` ou `zustand`
- criar documentação OpenAPI/Swagger para API

## Documentação oficial do projeto

- Documentação técnica sênior: `docs/documentacao-senior.md`
- Boas práticas e convenções: `docs/guia-boas-praticas-senior.md`
- ADR da hierarquia de usuários: `docs/adr/001-hierarquia-usuarios-permissoes.md`
- Programa LGPD: `docs/lgpd-programa-adequacao.md`
- Registro de operações de tratamento (Art. 37): `docs/lgpd-registro-operacoes.md`
- Playbook de incidentes de dados: `docs/lgpd-playbook-incidentes.md`
- Guia de integrações e HUB: `docs/integracoes-hub-guia.md`
- Acessos restritos e áreas particulares (LGPD): `docs/acessos-restritos-lgpd.md`
- SaaS multiempresa com cadastro via pagamento: `docs/saas-onboarding-pagamento.md`
- Operação de produção, go-live e rollback: `docs/operacao-go-live-rollback.md`
- Guia de alterações futuras do time: `docs/guia-alteracoes-futuras.md`
- Checklist de publicação na internet: `docs/publicacao-internet-checklist.md`
- DNS e SSL (sepeguiado): `docs/dns-e-ssl-sepeguiado.md`
