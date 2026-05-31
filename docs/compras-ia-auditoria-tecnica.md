# Compras IA - Auditoria Tecnica

## Objetivo
Garantir rastreabilidade forte das decisoes de IA na criacao de pedidos de compra, sem depender apenas de texto livre em observacoes.

## Camadas de persistencia
1. `metadata.iaAuditoria` (fonte primaria): estrutura JSON validada no backend.
2. `observacoes` (fonte secundaria): trilha textual + bloco JSON marcado por `[IA-AUDITORIA-JSON]`.

## Estrutura principal (`IA_AUDITORIA_V1`)
Campos persistidos em `metadata.iaAuditoria`:
- `marker`: versao do contrato (`IA_AUDITORIA_V1`)
- `contexto`: `WIZARD` ou `RAPIDO`
- `timestamp`: data/hora ISO
- `confiancaPedidoRapido`: score e nivel agregado
- `fornecedorRecomendado`: fornecedor com melhor ranking
- `itens[]`: lista com produto, quantidade, custo, score, nivel e motivos

## Validacao backend
Arquivo: `src/services/estoque.service.ts`

No schema de criacao de pedido (`pedidoCompraSchema`), `metadata.iaAuditoria` e validado via Zod para impedir:
- score fora de faixa
- niveis invalidos
- payload mal formado

## Endpoint de consulta
Rota protegida:
- `GET /estoque/compras/pedidos/:id/auditoria-ia`

Comportamento:
- prioriza `metadata.iaAuditoria`
- usa fallback por parsing do bloco `[IA-AUDITORIA-JSON]` em `observacoes`
- retorna `fonte` (`metadata`, `observacoes` ou `indisponivel`)

## Recomendacoes operacionais
1. Painel sempre deve consumir primeiro o endpoint dedicado de auditoria.
2. `observacoes` deve ser considerada apenas fallback e visual humano.
3. Para analytics futuro, ler de `metadata.iaAuditoria` e ignorar parsing textual.
