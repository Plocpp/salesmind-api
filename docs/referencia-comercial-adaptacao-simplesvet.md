# Referencia de Mercado Aplicada (Adaptacao Comercial)

## Fonte analisada

Tela de referencia: Produtos e servicos (Simples Vet), aproveitando apenas conceitos comerciais e de operacao de estoque.

Escopo explicitamente excluido nesta adaptacao:

- Fluxos clinicos
- Fluxos veterinarios
- Prontuario/atendimento

## Padrões observados e aproveitados

1. Busca unificada de catalogo
- Busca por nome, codigo e codigo de barras em um unico campo.

2. Cards com dados de decisao rapida
- Exibicao direta de markup, codigo, custo, preco de venda, estoque e validade.

3. Indicadores de validade no topo
- Contadores de itens vencidos e itens a vencer em janela configuravel (ex.: 60 dias).

4. Cadastro guiado por etapas
- Estrutura em wizard para reduzir erro operacional no cadastro.

5. Tipos de item no mesmo catalogo
- Produto, Servico, Pacote e Kit com comportamento comercial comum.

6. Campos comerciais obrigatorios
- Unidade de venda, grupo e marca para padronizar cadastro e compras.

## Traducao para nosso sistema (compra, venda, transporte rastreado)

1. Catalogo comercial unico
- Consolidar em um modelo de item comercial (produto/servico/pacote/kit).

2. Motor de margem e precificacao
- Exibir markup em tempo real por item e alertas de margem minima.

3. Validade orientada a risco
- Painel de itens vencidos e vencendo por janela (30/60/90 dias).

4. Compras orientadas por necessidade real
- Sugestoes automáticas combinando estoque minimo, giro, validade e pedidos em aberto.

5. Vinculo compra -> estoque -> venda -> financeiro
- Recebimento atualiza custo medio e disponibilidade de venda.
- Venda consome lote com regra FEFO quando houver validade.

6. Vinculo compra -> transporte rastreado
- Pedido de compra pode receber informacao logistica para rastreio de entrega e SLA.

## Requisitos funcionais priorizados

1. RF-CAT-01
- Buscar itens por nome, codigo interno e codigo de barras.

2. RF-CAT-02
- Exibir por item: custo, preco, markup, estoque, validade mais proxima e status de risco.

3. RF-CAT-03
- Permitir cadastro por tipo: PRODUTO, SERVICO, PACOTE, KIT.

4. RF-VAL-01
- Exibir contadores de itens vencidos e vencendo (janela configuravel).

5. RF-COM-01
- Sugerir compras por politica (estoque minimo + giro + validade + cobertura em dias).

6. RF-REC-01
- Receber compra com lote, validade e custo por lote.

7. RF-RAS-01
- Associar evento logistico de recebimento a sessao de rastreio quando houver transporte.

## Requisitos nao funcionais

1. RNF-001 Observabilidade
- Dashboard com tempos de ruptura, ruptura evitada e perda por vencimento.

2. RNF-002 Consistencia
- Transacoes atomicas para recebimento e atualizacao de saldo/lote.

3. RNF-003 Contrato
- Endpoints versionados em /api/v1, contratos OpenAPI versionados.

## Entregaveis de arquitetura recomendados

1. Documento de remodelacao
- `docs/remodelacao-estoque-compras-v2.md`

2. Contrato de API proposto
- `contracts/v1/proposals/estoque-compras-v2.openapi.yaml`

3. Backlog tecnico
- Quebrar implementacao em sprints: catalogo, validade, sugestao de compra, recebimento por lote, integracao com rastreio.
