# Modulo de Estoque e Servicos

Este modulo foi redefinido como o centro operacional de catalogo, estoque, compras, inventario e movimentacoes. A regra principal e: toda alteracao de saldo deve virar uma `MovimentacaoEstoque`, com origem, referencia e auditoria.

## Indice funcional

1. Produtos e servicos
2. Grupos de produtos
3. Depositos e saldos
4. Movimentacoes de estoque
5. Reservas
6. Compras e pedidos de compra
7. Inventario
8. Analise de estoque
9. Produtos recomendados
10. Integracoes com marketplaces e ERP

## Fluxo profissional

```text
Marketplace -> Pedido -> Reserva estoque -> Faturamento -> Expedicao -> Baixa estoque
```

O estoque trabalha com quatro saldos:

- `estoqueFisico`
- `estoqueReservado`
- `estoqueDisponivel`
- `estoqueTransito`

Exemplo:

```text
fisico: 100
reservado: 15
disponivel: 85
```

## Modelos criados ou expandidos

- `Produto`: agora suporta produto fisico, servico, digital e kit.
- `GrupoProduto`: hierarquia infinita, regras fiscais padrao, cor e icone.
- `DepositoEstoque`: matriz, filial, terceirizado, transito e marketplace.
- `ProdutoEstoque`: saldo por produto e deposito.
- `MovimentacaoEstoque`: entradas, saidas, reservas, transferencias, ajustes e inventario.
- `PedidoCompra` e `PedidoCompraItem`: fluxo de compra e reposicao.
- `InventarioEstoque` e `InventarioEstoqueItem`: contagem fisica, divergencia e auditoria.
- `ProdutoMidia`: imagens, videos e documentos.
- `ProdutoKitItem`: composicao de kits e combos.
- `ProdutoRecomendado`: cross sell, up sell e reposicao.
- `EstoqueAuditoria`: historico tecnico de operacoes.

## Endpoints iniciais

- `POST /estoque/grupos`
- `GET /estoque/grupos`
- `POST /estoque/depositos`
- `GET /estoque/depositos`
- `POST /estoque/movimentacoes`
- `POST /estoque/reservas`
- `POST /estoque/reservas/liberar`
- `GET /estoque/saldos`
- `GET /estoque/analise`
- `POST /estoque/compras/pedidos`
- `GET /estoque/compras/pedidos`
- `POST /estoque/inventarios`

## Integracao com vendas

Ao criar uma venda, o sistema:

- valida estoque disponivel;
- decrementa `Produto.estoque`;
- decrementa `Produto.estoqueDisponivel`;
- cria `MovimentacaoEstoque` do tipo `SAIDA_VENDA`;
- cria o lancamento financeiro de receita.

## Arquitetura recomendada para a proxima fase

```text
catalog-service
  produtos, servicos, grupos, marcas, midias, kits

estoque-service
  saldos, reservas, movimentacoes, inventario

compras-service
  solicitacao, cotacao, pedido, recebimento

integration-service
  Mercado Livre, Shopee, Amazon, Magazine Luiza, Bling

financeiro-service
  contas a pagar, lancamentos, conciliacao, DRE, fluxo de caixa
```

## Eventos futuros

- `produto.criado`
- `produto.atualizado`
- `estoque.reservado`
- `estoque.reserva_liberada`
- `estoque.baixado`
- `estoque.transferido`
- `estoque.inventario_finalizado`
- `compra.pedido_criado`
- `compra.recebida`
- `marketplace.estoque_sincronizado`

## Proximos passos

- Criar migration real: `npx prisma migrate dev --name add_estoque_servicos`.
- Implementar recebimento de pedido de compra com entrada automatica em estoque.
- Finalizar inventario com ajuste automatico de divergencias.
- Criar tela de estoque no frontend.
- Criar camada de eventos para webhooks de marketplaces.
- Adicionar cache Redis para leitura rapida de saldo disponivel.
