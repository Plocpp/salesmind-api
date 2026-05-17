# Acessos Restritos e Areas Particulares (LGPD)

## Objetivo

Permitir cadastro de acessos com restricoes por area do sistema, com trilha de auditoria LGPD (finalidade, base legal e minimizacao de dados).

## Endpoints

- GET `/acessos/me`
  - Lista os acessos do usuario autenticado e as areas permitidas.

- GET `/acessos`
  - Perfil requerido: `ADMIN` ou `GERENTE`.
  - Lista todos os acessos cadastrados.

- POST `/acessos`
  - Perfil requerido: `ADMIN` ou `GERENTE`.
  - Cadastra novo acesso restrito.

- POST `/acessos/:id/revoke`
  - Perfil requerido: `ADMIN` ou `GERENTE`.
  - Revoga um acesso existente (mantendo trilha).

- GET `/acessos/auditoria/lgpd`
  - Perfil requerido: `ADMIN` ou `GERENTE`.
  - Lista eventos de auditoria LGPD de acessos.

## Exemplo de cadastro de acesso

```json
{
  "userIdAlvo": "uuid-do-usuario",
  "nomeAcesso": "Operador Integracoes",
  "areasPermitidas": ["integracoes-hub", "integracoes-marketplaces"],
  "dadosPermitidos": ["nome", "email", "status_integracao"],
  "baseLegal": "execucao_de_contrato",
  "finalidade": "operar sincronizacao de pedidos dos marketplaces",
  "justificativa": "time operacional de ecommerce",
  "expiraEm": "2026-12-31T23:59:59.000Z",
  "restricoes": {
    "horario": "08:00-18:00",
    "somenteLeitura": false
  }
}
```

## Regras de LGPD aplicadas

- Finalidade obrigatoria no momento da concessao.
- Base legal obrigatoria no momento da concessao.
- Dados permitidos obrigatorios (minimizacao de dados).
- Auditoria de criacao e revogacao de acesso.
- Possibilidade de expiracao automatica por data.

## Integracao com autenticacao

No login (`POST /auth/login`) e no perfil (`GET /auth/me`), o backend retorna `areasPermitidas`.

Isso permite o frontend habilitar/ocultar modulos e respeitar areas particulares por usuario.

## Middleware para proteger area privada

Arquivo: `src/middlewares/acesso-area.middleware.ts`

Uso sugerido:

```ts
router.get('/minha-rota', authMiddleware, authorizeArea('integracoes-hub'), handler)
```

Quando o usuario nao tiver acesso ativo para a area, retorna HTTP 403 com mensagem de restricao LGPD.
