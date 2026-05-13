# Modulo Financeiro

O financeiro foi estruturado como centro unico de movimentacoes do ERP. A regra principal e simples: qualquer evento relevante do sistema deve gerar ou atualizar um lancamento financeiro rastreavel.

## Fluxo base

```text
Marketplaces / PDV / ERP / Gateways / Bancos
  -> Hub de integracoes
  -> Eventos normalizados
  -> Financeiro
  -> Lancamento, conciliacao, auditoria e relatorios
```

O modulo nao deve depender diretamente de APIs como Shopee, Mercado Livre, Amazon, Magazine Luiza ou Bling. Cada integracao deve publicar dados normalizados para o financeiro, mantendo o dominio financeiro estavel mesmo quando uma API externa muda.

## Entidades criadas

- `Empresa`: base para multiempresa.
- `ContaFinanceira`: bancos, caixas, carteiras, cartoes e gateways.
- `CategoriaFinanceira`: categorias hierarquicas para DRE, fluxo e BI.
- `FormaPagamentoFinanceira`: meios de pagamento com taxas, prazo e antecipacao.
- `LancamentoFinanceiro`: nucleo do financeiro, com tipo, status, valores, origem, vencimento, pagamento, relacionamento com venda, cliente, fornecedor e usuario.
- `ConciliacaoCartao`: conferencias de venda, taxa, parcela e recebimento real.
- `FinanceiroAuditoria`: historico de criacao, baixa, conciliacao, cancelamento, edicao e estorno.

## Endpoints iniciais

- `POST /financeiro/lancamentos`
- `GET /financeiro/lancamentos`
- `POST /financeiro/lancamentos/:id/baixa`
- `POST /financeiro/contas`
- `GET /financeiro/contas`
- `POST /financeiro/categorias`
- `GET /financeiro/categorias`
- `POST /financeiro/formas-pagamento`
- `GET /financeiro/formas-pagamento`
- `POST /financeiro/conciliacoes/cartoes`
- `GET /financeiro/demonstrativo`
- `GET /financeiro/fluxo-caixa`

## Automacao ja conectada

Ao criar uma venda, o sistema tambem cria um `LancamentoFinanceiro` de `RECEITA`, com:

- `origem`: por padrao `VENDA`, podendo receber marketplace ou ERP.
- `origemReferencia`: ID da venda.
- `vendaId`, `clienteId` e `usuarioId`.
- `valorBruto` e `valorLiquido` iguais ao total da venda.

## Proximos passos recomendados

- Criar migration real com `npx prisma migrate dev --name add_financeiro`.
- Adicionar fila/event bus para transformar webhooks em eventos normalizados.
- Implementar anexos financeiros para boleto, nota fiscal, contrato e comprovante.
- Separar permissao financeira por papel: operador, gerente, financeiro e admin.
- Criar importadores OFX, CNAB e CSV para conciliacao bancaria/cartoes.
- Evoluir `Fornecedor` com IE, razao social, dados bancarios, PIX, score e contratos.
