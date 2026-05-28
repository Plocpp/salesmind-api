# Matriz de Priorizacao para Extracao de Blocos

## Objetivo

Definir uma ordem pratica para transformar o backend atual em blocos reutilizaveis entre sistemas padronizados, reduzindo retrabalho e risco operacional.

## Escala usada

- Esforco: Baixo, Medio, Alto
- Risco: Baixo, Medio, Alto
- Prioridade: P0 (imediato), P1 (curto prazo), P2 (medio prazo)

## Matriz de priorizacao

| Bloco | Prioridade | Valor de reuso | Esforco | Risco | Dependencias principais | Resultado esperado |
|---|---|---|---|---|---|---|
| Auth | P0 | Alto | Medio | Medio | JWT, policy de senha, auditoria de login | Modulo de autenticacao reutilizavel para qualquer sistema |
| Acessos (RBAC) | P0 | Alto | Medio | Medio | Auth, matriz de permissao por area | Controle padrao de permissoes por perfil e usuario |
| Financeiro | P0 | Muito alto | Alto | Medio | Cadastros, vendas/estoque, regras de conciliacao | Nucleo financeiro compartilhado com contrato estavel |
| Vendas | P1 | Alto | Alto | Medio | Produtos, clientes, financeiro, fiscal | Fluxo comercial reutilizavel com emissao fiscal integrada |
| Estoque | P1 | Alto | Alto | Medio | Produtos, compras, financeiro | Bloco de inventario e compras reaproveitavel |
| Cadastros | P1 | Medio | Medio | Baixo | Entidades base (fornecedor, marca, etc.) | Base de dados mestra para os demais modulos |
| Diagnostico | P1 | Medio | Baixo | Baixo | Infra de logs e health | Pacote de observabilidade padrao |
| Integracoes | P2 | Medio | Alto | Alto | Provedores externos e credenciais | Adaptadores por provedor com contrato comum |
| Onboarding | P2 | Medio | Alto | Alto | Pagamento, provisioning, e-mail | Entrada SaaS reaproveitavel entre produtos |
| Rastreio | P2 | Especifico | Alto | Alto | Mobile, geolocalizacao, telemetria | Modulo vertical para cenarios de logistica |

## Sequencia recomendada de extracao

1. Sprint 1 e 2
- Auth
- Acessos
- Diagnostico

2. Sprint 3 e 4
- Financeiro (primeiro recorte: lancamentos e contas)
- Cadastros base

3. Sprint 5 e 6
- Vendas (com contratos fiscais)
- Estoque (compras e movimentacoes)

4. Sprint 7+
- Integracoes
- Onboarding
- Rastreio

## Fatiamento recomendado por bloco

Para cada bloco, extrair nesta ordem:

1. Contrato
- Definir OpenAPI do bloco em `contracts/v1/{bloco}.yaml`.

2. Tipos compartilhados
- Mover DTOs/schemas/enums para pacote interno comum.

3. Dominio
- Isolar regras do service para depender de interfaces, nao do ORM direto.

4. Adaptadores
- Implementar repositorios Prisma como adaptador da interface.

5. Publicacao
- Disponibilizar como modulo reutilizavel interno.

## Criterios de pronto para considerar bloco reutilizavel

- Contrato OpenAPI publicado e versionado.
- Suite minima de testes de contrato + casos criticos de negocio.
- Dependencias externas encapsuladas por interface.
- Changelog de versao e politica de compatibilidade definidos.

## Riscos principais e mitigacao

- Acoplamento ao schema unico atual
  - Mitigar com camada de repositorio por interface.

- Divergencia de regra de negocio entre sistemas
  - Mitigar com feature flags por consumidor.

- Quebra de contrato em evolucao rapida
  - Mitigar com versionamento semantico e deprecacao planejada.

## Primeiro piloto sugerido

Piloto: extrair subbloco `financeiro-lancamentos`.

Motivos:

- Alto valor transversal.
- Uso recorrente em multiplos sistemas.
- Fronteira de contrato mais objetiva.

Entregavel do piloto:

- Contrato `financeiro-lancamentos` em OpenAPI.
- Pacote de tipos compartilhados financeiros.
- Adaptador Prisma e testes de regressao do fluxo principal.
