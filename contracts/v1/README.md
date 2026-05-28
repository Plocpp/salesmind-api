# Contratos OpenAPI v1

Este diretorio concentra os contratos OpenAPI dos modulos da API.

## Contratos disponiveis

- auth: `contracts/v1/auth.openapi.yaml`
- acessos: `contracts/v1/acessos.openapi.yaml`
- produtos: `contracts/v1/produtos.openapi.yaml`
- cadastros: `contracts/v1/cadastros.openapi.yaml`
- vendas: `contracts/v1/vendas.openapi.yaml`
- financeiro-lancamentos: `contracts/v1/financeiro-lancamentos.openapi.yaml`
- estoque: `contracts/v1/estoque.openapi.yaml`
- integracoes: `contracts/v1/integracoes.openapi.yaml`
- onboarding: `contracts/v1/onboarding.openapi.yaml`
- rastreio: `contracts/v1/rastreio.openapi.yaml`
- diagnostico: `contracts/v1/diagnostico.openapi.yaml`

## Diretriz

- Novas integracoes devem consumir preferencialmente os caminhos versionados `/api/v1`.
- Os contratos usam `servers` com `/api/v1` e `/` para cobrir v1 e legado.
- Evolucoes de contrato devem manter versionamento semantico e changelog.
