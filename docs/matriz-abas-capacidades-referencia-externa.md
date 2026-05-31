# Matriz de Abas e Capacidades (Referencia Externa)

## Objetivo

Mapear as abas do sistema de referencia para capacidades reutilizaveis no SalesMind, priorizando execucao em P0, P1 e P2.

Ordenacao desta matriz: de baixo para cima no menu lateral observado.

## Escala

- Prioridade: P0 (imediato), P1 (curto prazo), P2 (medio prazo)
- Aderencia: Alta, Media, Baixa

## Matriz (de baixo para cima)

| Ordem | Aba de referencia | Capacidades principais | Aderencia no SalesMind | Modulo/rota alvo SalesMind | Contrato OpenAPI | Prioridade |
|---|---|---|---|---|---|---|
| 1 | Pesquisa de satisfacao | NPS, respostas, painel de satisfacao | Media | Novo modulo relacionamento (`/relacionamento/nps/*`) | Novo contrato proposto | P2 |
| 2 | Mensagens | Historico, campanhas, automacoes, creditos | Alta | Integracoes e novo modulo relacionamento (`/relacionamento/mensagens/*`) | Novo contrato proposto | P1 |
| 3 | Clientes (portal) | Usuarios de portal, acesso externo | Media | Onboarding e acessos (`/onboarding/*`, `/acessos/*`) | [contracts/v1/onboarding.openapi.yaml](../contracts/v1/onboarding.openapi.yaml), [contracts/v1/acessos.openapi.yaml](../contracts/v1/acessos.openapi.yaml) | P1 |
| 4 | Portal | Convites e configuracoes de acesso cliente | Media | Onboarding + acessos (`/onboarding/suporte/*`, `/acessos/*`) | [contracts/v1/onboarding.openapi.yaml](../contracts/v1/onboarding.openapi.yaml), [contracts/v1/acessos.openapi.yaml](../contracts/v1/acessos.openapi.yaml) | P1 |
| 5 | Site | CMS basico (paginas, destaque, mensagens) | Baixa | Fora do nucleo atual | Nao aplicavel agora | P2 |
| 6 | NFC-e | Caixa de saida fiscal, perfis tributarios, configuracao fiscal | Alta | Vendas fiscal (`/vendas/*/emitir-nfce`, `/vendas/documentos-fiscais`) | [contracts/v1/vendas.openapi.yaml](../contracts/v1/vendas.openapi.yaml) | P0 |
| 7 | Configuracao | Empresa, usuarios, perfis, acesso externo | Alta | Acessos + auth + onboarding | [contracts/v1/acessos.openapi.yaml](../contracts/v1/acessos.openapi.yaml), [contracts/v1/auth.openapi.yaml](../contracts/v1/auth.openapi.yaml) | P0 |
| 8 | Beta | Features experimentais | Baixa | Tratar via feature flag e diagnostico | [contracts/v1/diagnostico.openapi.yaml](../contracts/v1/diagnostico.openapi.yaml) | P2 |
| 9 | Financeiro | Lancamentos, conciliacao, contas, fluxo, categorias | Alta | Financeiro (`/financeiro/*`) | [contracts/v1/financeiro-lancamentos.openapi.yaml](../contracts/v1/financeiro-lancamentos.openapi.yaml) | P0 |
| 10 | Estoque e servicos | Produtos/servicos, compras, inventario, analise | Alta | Estoque (`/estoque/*`) | [contracts/v1/estoque.openapi.yaml](../contracts/v1/estoque.openapi.yaml), [contracts/v1/proposals/estoque-compras-v2.openapi.yaml](../contracts/v1/proposals/estoque-compras-v2.openapi.yaml) | P0 |
| 11 | Internacao | Fluxos clinicos hospitalares | Baixa | Fora de escopo comercial atual | Nao aplicavel agora | P2 |
| 12 | Cadastros | Entidades base e tabelas de apoio | Media | Cadastros/fornecedores/produtos | [contracts/v1/cadastros.openapi.yaml](../contracts/v1/cadastros.openapi.yaml), [contracts/v1/produtos.openapi.yaml](../contracts/v1/produtos.openapi.yaml) | P1 |
| 13 | Consultas | Relatorios e consultas operacionais | Media | Diagnostico e consultas de modulos | [contracts/v1/diagnostico.openapi.yaml](../contracts/v1/diagnostico.openapi.yaml) | P1 |
| 14 | Inteligencia | Dashboards de produtividade e vendas | Alta | Vendas + financeiro + diagnostico (endpoints de dashboard) | [contracts/v1/vendas.openapi.yaml](../contracts/v1/vendas.openapi.yaml), [contracts/v1/financeiro-lancamentos.openapi.yaml](../contracts/v1/financeiro-lancamentos.openapi.yaml) | P1 |
| 15 | Comissionamento | Comissoes, extratos, fechamento | Alta | Novo modulo comercial (`/vendas/comissionamento/*`) | Novo contrato proposto | P1 |
| 16 | Vendas | PDV, caixa, recebimentos, lista preco, ranking | Alta | Vendas (`/vendas/*`) | [contracts/v1/vendas.openapi.yaml](../contracts/v1/vendas.openapi.yaml) | P0 |
| 17 | Agenda | Agenda, escala, configuracoes operacionais | Media | Futuro modulo de agenda (`/agenda/*`) | Novo contrato proposto | P2 |
| 18 | Clientes (core) | CRM base, ranking, saldos | Alta | Vendas + cadastros (`/vendas/clientes/*`, `/clientes/*`) | [contracts/v1/vendas.openapi.yaml](../contracts/v1/vendas.openapi.yaml), [contracts/v1/cadastros.openapi.yaml](../contracts/v1/cadastros.openapi.yaml) | P0 |

## Pacotes de execucao recomendados

### Pacote P0 (execucao imediata)

1. Estoque e servicos + Vendas + Financeiro + NFC-e + Configuracao core.
2. Consolidar os novos endpoints de catalogo v2, validade e sugestao de compra no contrato oficial de estoque.
3. Fechar testes de escrita e leitura para vendas fiscais e compras com impacto financeiro.

### Pacote P1 (curto prazo)

1. Comissionamento.
2. Inteligencia (painel gerencial consolidado).
3. Mensagens e relacionamento com foco comercial.

### Pacote P2 (medio prazo)

1. Pesquisa de satisfacao.
2. Agenda.
3. Portal/Site e demais recursos nao centrais ao nucleo comercial-fiscal.

## Resultado esperado

Com esta priorizacao, o SalesMind evolui com foco em:

1. Operacao comercial completa sem ruptura.
2. Reuso real de blocos entre sistemas padronizados.
3. Contratos de API claros por capacidade de negocio.

## Referencias complementares

- Mapeamento de caminhos por menu e rota: [mapeamento-simplesvet-caminhos.md](mapeamento-simplesvet-caminhos.md)
- Guia funcional por pagina com validado/inferido: [simplesvet-capacidades-funcionais.md](simplesvet-capacidades-funcionais.md)
