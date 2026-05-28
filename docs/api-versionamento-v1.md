# API Versionamento v1 e Compatibilidade

## Objetivo

Padronizar a API para consumo enterprise usando base versionada em `/api/v1`, sem quebrar integrações existentes em caminhos legados.

## Estado atual

A API responde em dois formatos de base path:

- Legado: `/{modulo}/...`
- Versionado: `/api/v1/{modulo}/...`

Ambos apontam para os mesmos routers/controllers.

## Módulos com alias v1

- `/auth` e `/api/v1/auth`
- `/acessos` e `/api/v1/acessos`
- `/produtos` e `/api/v1/produtos`
- `/vendas` e `/api/v1/vendas`
- `/cadastros` e `/api/v1/cadastros`
- `/financeiro` e `/api/v1/financeiro`
- `/estoque` e `/api/v1/estoque`
- `/integracoes` e `/api/v1/integracoes`
- `/onboarding` e `/api/v1/onboarding`
- `/rastreio` e `/api/v1/rastreio`
- `/diagnostico` e `/api/v1/diagnostico`
- `/health` e `/api/v1/health`

## Tabela de equivalência (exemplos)

- `POST /auth/login` => `POST /api/v1/auth/login`
- `GET /health` => `GET /api/v1/health`
- `POST /vendas/vendas/:id/emitir-nfce` => `POST /api/v1/vendas/vendas/:id/emitir-nfce`
- `POST /vendas/vendas/:id/emitir-nfe` => `POST /api/v1/vendas/vendas/:id/emitir-nfe`
- `GET /vendas/documentos-fiscais` => `GET /api/v1/vendas/documentos-fiscais`
- `POST /estoque/compras/notas-fiscais/recebimento` => `POST /api/v1/estoque/compras/notas-fiscais/recebimento`
- `GET /estoque/compras/notas-fiscais` => `GET /api/v1/estoque/compras/notas-fiscais`
- `PATCH /financeiro/documentos/lancamentos` => `PATCH /api/v1/financeiro/documentos/lancamentos`
- `POST /financeiro/documentos/enviar-manual` => `POST /api/v1/financeiro/documentos/enviar-manual`

## Diretriz para novos consumidores

Para novos sistemas e integrações, usar sempre `/api/v1`.

## Política de evolução recomendada

1. Novas funcionalidades entram primeiro em `/api/v1`.
2. Endpoints legados permanecem por janela de compatibilidade.
3. Após adoção consolidada, anunciar depreciação com prazo mínimo de 90 dias.
4. Publicar changelog com impacto por endpoint.

## Critérios de qualidade para rotas padronizadas

- Substantivos no plural por recurso (`/lancamentos`, `/pedidos`, `/clientes`).
- Verbos de ação apenas quando a operação representa comando de negócio (`/enviar-manual`, `/emitir-nfe`).
- Verbos HTTP semânticos (`GET`, `POST`, `PATCH`, `PUT`, `DELETE`).
- Filtro por query string e não no path.

## Checklist rápido para times de integração

- Base URL definida para `/api/v1`.
- Tratamento de erros HTTP por status code.
- Retry somente em operações idempotentes.
- Controle de rate limit no cliente.
- Versionamento do contrato no repositório consumidor.
