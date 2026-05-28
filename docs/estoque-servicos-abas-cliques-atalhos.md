# Estoque e Servicos - Abas, Cliques e Atalhos Operacionais

## Escopo desta validacao

- Referencia publica analisada:
  - https://simples.vet/
  - https://simples.vet/funcionalidades/
  - https://simples.vet/o-que-resolvemos/controle-de-estoque/
- Escopo mantido: estoque, compras e operacao comercial.
- Escopo removido: partes veterinarias/clinicas.

## Abas e locais de clique mapeados (referencia publica)

1. Funcionalidades > Controle de estoque
- Clique em "Análise automática do estoque"
- Clique em "Pedidos de compra"
- Clique em "Devolução de compras ao fornecedor"
- Clique em "Registro de compras via XML"
- Clique em "Impressão de etiquetas para produtos"
- Clique em "Controle de consumo interno"
- Clique em "Controle de avarias, perda de validade e doações"
- Clique em "Inventários de estoque pelo celular"
- Clique em "Fracionamento de produtos"

2. Funcionalidades > Vendas para clínica e petshop
- Clique em "Ponto de venda"
- Clique em "Controle de pacotes e kits"
- Clique em "Devoluções de venda"
- Clique em "Limite de desconto"

3. Home > Segmento Pet shops
- Clique em "Gestão de estoque rápida e simples"
- Clique em "Relatórios completos de vendas e financeiro"

## Cobertura em API no SalesMind

1. Catalogo e pesquisa
- GET /estoque/catalogo/itens
- Novos filtros: q, tipo, grupoId, marcaId, ativo, statusEstoque, somenteComValidade

2. Validade e risco
- GET /estoque/catalogo/indicadores-validade

3. Compras
- GET /estoque/compras/pedidos
- Novos filtros: status, fornecedorId, q, inicio, fim
- GET /estoque/compras/sugestoes
- POST /estoque/compras/notas-fiscais/recebimento

4. Saldos e operacao
- GET /estoque/saldos
- Novos filtros: produtoId, depositoId, q, abaixoMinimo, comReserva

5. Atalhos operacionais
- GET /estoque/atalhos-operacionais

## Atalhos operacionais copiados/adaptados para manipulacao de estoque e compra

Observacao: atalhos de teclado especificos nao foram encontrados em fonte publica; os atalhos abaixo sao atalhos de fluxo (acesso rapido por rota).

1. EST-AT-01 Pesquisar catalogo
- Rota: /estoque/catalogo/itens?q=
- Uso: localizar item por nome/codigo/codigo de barras/SKU

2. EST-AT-02 Conferir validade critica
- Rota: /estoque/catalogo/indicadores-validade?janelaDias=60
- Uso: agir rapido em vencidos/vencendo

3. EST-AT-03 Gerar sugestao de compra
- Rota: /estoque/compras/sugestoes?coberturaDias=30
- Uso: reposicao com base em giro e estoque minimo

4. EST-AT-04 Filtrar pedidos de compra
- Rota: /estoque/compras/pedidos?status=ABERTO&q=
- Uso: localizar pedidos por numero e fornecedor

5. EST-AT-05 Ver ruptura imediata
- Rota: /estoque/catalogo/itens?statusEstoque=RUPTURA
- Uso: listar itens sem disponibilidade para acionar compra

## Proximo passo recomendado

- Replicar estes atalhos na interface web como botoes fixos no modulo de Estoque para reduzir cliques operacionais.
