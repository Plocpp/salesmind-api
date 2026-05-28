# Remodelacao Estoque e Compras v2

## Objetivo

Evoluir estoque e compras para um modelo comercial orientado a margem, validade, giro e abastecimento inteligente, mantendo compatibilidade com venda e transporte rastreado.

## Escopo

Inclui:

- Catalogo comercial unico (produto/servico/pacote/kit)
- Politica de precificacao por custo e markup
- Estoque por lote/validade
- Compras orientadas por sugestao
- Recebimento com custo real e impacto financeiro
- Integracao opcional com rastreio de entrega

Exclui:

- Qualquer fluxo clinico ou veterinario

## Modelo de dominio proposto

1. ItemComercial
- id, tipo, nome, codigoInterno, codigoBarras, unidadeVenda, grupoId, marcaId, ativo

2. PoliticaPreco
- itemId, precoVenda, custoAtual, markupAlvo, margemMinima, estrategiaAjuste

3. LoteEstoque
- itemId, lote, validade, quantidade, custoUnitarioLote, depositoId, status

4. PoliticaReposicao
- itemId, estoqueMinimo, estoqueSeguranca, coberturaDias, leadTimeDias, pontoPedido

5. PedidoCompra
- fornecedorId, status, previsaoEntrega, frete, impostos, itens[]

6. RecebimentoCompra
- pedidoId, dataRecebimento, itensRecebidos[], divergencias, custoFinal

7. VinculoLogistico (opcional)
- pedidoCompraId, sessaoRastreioId, transportadora, previsaoEntrega, statusEntrega

## Fluxos principais

1. Cadastro de item (wizard)
- Dados basicos -> classificacao -> preco -> estoque inicial -> fiscal -> resumo

2. Monitor de validade
- Indicadores: vencidos, vencendo em 30/60/90 dias
- Acoes: bloquear venda, liquidar, transferir, descartar

3. Sugestao de compra
- Entrada: historico de vendas, saldo atual, itens em transito, validade critica
- Saida: quantidade sugerida por item e justificativa

4. Recebimento de compra
- Atualiza lote, custo medio, financeiro e status do pedido
- Se houver vinculo logistico: atualiza rastreio da entrega

## Contrato de API proposto

Referencia:

- `contracts/v1/proposals/estoque-compras-v2.openapi.yaml`

Principais recursos:

- Catalogo: `/estoque/catalogo/*`
- Validade: `/estoque/catalogo/indicadores-validade`
- Sugestoes: `/estoque/compras/sugestoes`
- Pedidos: `/estoque/compras/pedidos`
- Recebimento: `/estoque/compras/pedidos/{id}/recebimentos`
- Vinculo logístico: `/estoque/compras/pedidos/{id}/rastreio`

## Migração sugerida (sem ruptura)

1. Fase 1 (compatibilidade)
- Adicionar novas tabelas e endpoints v2 sem remover fluxo atual

2. Fase 2 (coexistencia)
- UI passa a consumir v2 para catalogo e validade
- Rotinas atuais continuam operando

3. Fase 3 (cutover)
- Compras e recebimento migram para v2
- Adaptadores mantem leitura dos dados legados

4. Fase 4 (deprecacao)
- Congelar endpoints antigos e anunciar prazo de desativacao

## Indicadores de sucesso

1. Reducao de ruptura de estoque
2. Reducao de perdas por vencimento
3. Aumento de margem por item
4. Reducao de tempo de cadastro de item
5. Acuracia de compra sugerida vs compra realizada

## Proximo passo tecnico recomendado

1. Implementar primeiro:
- `/estoque/catalogo/itens`
- `/estoque/catalogo/indicadores-validade`
- `/estoque/compras/sugestoes`

2. Depois implementar:
- Recebimento por lote com impacto financeiro e opcao de vinculo de rastreio
