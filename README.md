# SalesMind API + Frontend

Sistema de gestão de vendas e estoque para pet shop, com backend em Node.js + Express + TypeScript + Prisma e frontend em React + Vite.

## Visão geral

- Backend: `src/`
- Frontend: `src/frontend/`
- Banco de dados: Prisma + MySQL
- Autenticação: JWT
- Papéis de usuário: `ADMIN`, `VENDEDOR`, `USER`

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
