# SimplesVet - Capacidades Funcionais por Pagina

Data da analise: 2026-05-30
Escopo: sessao autenticada no ambiente app.simples.vet

## Como ler este guia

- Validado na tela: funcionalidade observada diretamente durante navegacao.
- Inferido por rota/menu: capacidade deduzida por URL, titulo da pagina e estrutura dos controles.

## 1) Compras (analise detalhada)

Pagina principal: https://app.simples.vet/cadastro/compra/compra.php

### 1.1 Capacidade de listagem operacional (validado na tela)

- Filtros por codigo, NF, periodo e fornecedor.
- Acoes de toolbar: pesquisar, filtrar, limpar, imprimir, configuracao, adicionar e importar XML.
- Grid de compras com colunas: codigo, entrada, fornecedor, NF, emissao, valor e acoes.
- Acoes por linha: visualizar, editar e excluir.

### 1.2 Capacidade de absorcao de nota fiscal (validado na tela)

No resumo da compra:

- Bloco de informacoes fiscais: codigo, data de inclusao, emissao, NF, usuario, natureza.
- Bloco de fornecedor: nome, CNPJ, IE, telefone e endereco.
- Itens da nota com custo, quantidade, total e sugestao comercial (margem, valor sugerido, valor de venda).
- Forma de pagamento parcelada por vencimento e valor.

### 1.3 Capacidade de edicao de compra (validado na tela)

- Edicao de data/hora de entrada e natureza.
- Selecao ampla de fornecedor (combo pesquisavel).
- Edicao de observacoes.
- Forma de pagamento com:
  - tipo de recebimento/pagamento,
  - conta financeira,
  - parcelas (a vista, 2x...12x e personalizado),
  - vencimentos por parcela com valor e observacao.

### 1.4 Capacidade de fracionamento/divisao de produto (validado na tela)

Modal observado: Fracionar produto

- Exibe dados da nota do item: produto, unidade de medida e quantidade.
- Permite definir fator de fracionamento: Cada [unidade de compra] contem [x] unidade.
- Calcula entrada final no estoque com formula explicita (ex.: 10 DS x 1,00 unidade).
- Possui link de ajuda operacional especifico para fracionamento na importacao XML.

### 1.5 Capacidade de importacao XML (validado parcialmente)

- Botao/controle de upload de arquivo XML visivel na toolbar de compras.
- Integracao com fluxo de fracionamento em itens de nota foi identificada na UI.
- Nao houve envio de arquivo nesta analise (sem fixture XML), entao validacao de ponta a ponta de upload parseado ficou pendente.

### 1.6 Capacidade de cadastro manual de nova compra (validado na tela)

- Fluxo Adicionar abre formulario com codigo Nova.
- Campos obrigatorios guiados (fornecedor como passo inicial).
- Secao Produtos com busca/pesquisa de item por codigo de barras, codigo ou nome.
- Secao Forma de pagamento inicialmente bloqueada e liberada conforme preenchimento do fluxo.

## 2) Demais abas - capacidades por modulo

## 2.1 Painel e clientes

- Painel de controle: indicadores e widgets gerenciais. (validado na tela)
- Atendimento clinico: atendimento operacional clinico. (inferido por rota/menu)
- Clientes: base de clientes com pesquisa/listagem e acoes de cadastro. (validado por pagina e estrutura)

## 2.2 Agenda e vendas

- Agenda: agenda diaria com visualizacao operacional. (validado por titulo e pagina)
- Vendas (PDV): operacao de venda em ponto de venda. (validado por pagina)
- Consulta de vendas: consulta/listagem de vendas com filtros. (validado por pagina)
- Comissionamento: fechamento, extratos e minhas comissoes. (validado por rotas)
- Inteligencia: produtividade e visoes analiticas de vendas. (validado por pagina/rota)

## 2.3 Estoque e servicos

- Produtos e servicos: cadastro/catalogo comercial. (validado por pagina)
- Compras: recebimento de NF, itens, pagamento, fracionamento e XML. (validado detalhado)
- Pedido de compra: gestao de pedidos de compra. (validado por pagina/rota)
- Analise de estoque: visoes de ruptura, cobertura e status de estoque. (validado por pagina/rota)
- Inventario, outras saidas, grupos e marcas: governanca de estoque/cadastro. (inferido por rotas do modulo)

### 2.3.1 Pedido de compra - fluxo de criacao (validado na tela)

Pagina: https://app.simples.vet/v3/comercial/pedidos-compra e https://app.simples.vet/v3/comercial/pedidos-compra/adicionar

- Fluxo de criacao em wizard por etapas.
- Etapa observada: Selecionar fornecedor (1/4).
- Controle de avancar passo a passo, reduzindo erro operacional de preenchimento.
- Tela principal com acoes de operacao: Adicionar, Filtrar, Relatorios e Mais acoes.
- Validacao observada no passo 1: ao avancar sem fornecedor, exibe "Revise os campos marcados em vermelho" e "Campo obrigatorio".
- Restricao observada no ambiente desta sessao: lista de fornecedores veio sem opcoes utilizaveis (placeholder + opcao vazia), impedindo avancar para os passos 2..4 sem dados adicionais.

Observacao adicional desta rodada:

- A tentativa de seguir para passos seguintes manteve o bloqueio por indisponibilidade de fornecedor valido nesta conta/sessao.
- Evidencia de tela no select de fornecedor: apenas placeholder `Fornecedor*` e opcao vazia, sem registros utilizaveis para selecionar.

### 2.3.2 Produtos e servicos - operacao e cadastro guiado (validado na tela)

Pagina: https://app.simples.vet/v3/comercial/produtos-servicos e https://app.simples.vet/v3/comercial/produtos-servicos/adicionar

- Busca unificada por nome, codigo e codigo de barras.
- Indicadores de validade no topo (vencidos e vencendo em 60 dias).
- Grid comercial com colunas: nome, markup, codigo, estoque, custo, validade e preco de venda.
- Cadastro em wizard de 7 etapas (1/7 em Dados basicos validado).
- Tipo de item no cadastro: Produto, Servico, Pacote, Kit.
- Campos comerciais estruturantes no inicio do cadastro: codigo de barras, nome, unidade de venda, marca e grupo.
- Validacao observada no passo 1: avancar sem preencher dispara "Revise os campos marcados em vermelho" e marca como obrigatorios os campos Nome, Unidade de venda e Grupo ao qual pertence.

Observacoes adicionais desta rodada:

- Nesta sessao/conta o wizard apareceu como 1/5 (na rodada anterior havia sido observado 1/7).
- Mesmo preenchendo Nome e Unidade de venda, o avancar permaneceu bloqueado quando Grupo ao qual pertence nao estava com opcao valida selecionavel.
- Tipo de item selecionado durante teste: Servico (sem salvar).
- No mesmo passo foram exibidos outros controles com opcoes validas (politica de uso do item e regra de desconto), indicando que o bloqueio principal estava concentrado no Grupo obrigatorio sem cadastro associado.

## 2.4 Financeiro e fiscal

- Lancamentos: central de lancamentos financeiros. (validado por pagina)
- Contas a pagar: controle de titulos a pagar. (validado por pagina)
- Fluxo de caixa: apuracao de entradas e saidas no tempo. (validado por pagina)
- NFC-e (caixa de saida): operacao de documentos fiscais de produto. (validado por pagina)
- Configuracao fiscal: parametros tributarios/certificado/perfis. (validado por pagina)

### 2.4.1 Lancamentos - capacidades operacionais (validado na tela)

Pagina: https://app.simples.vet/financeiro/lancamento/lancamento.php

Observacao de navegacao desta rodada:

- Tentativas de acesso direto via https://app.simples.vet/v3/financeiro/lancamentos redirecionaram para o dashboard legado; o caminho funcional observado para Lancamentos nesta conta foi o link legado do menu Financeiro.

- Abas operacionais observadas: Resumo, Lancamentos e Geral.
- Fluxos financeiros no mesmo modulo: Receita, Despesa e Transferencia.
- Campos de negocio relevantes: categoria, descricao, documento, fornecedor, forma de pagamento, natureza, vencimento, competencia, valor, desconto, multa, juros e pago em.
- Capacidade de recorrencia/parcelamento com intervalo, quantidade de parcelas e regra de competencia.
- Acoes de ciclo de vida: salvar, cancelar, excluir, baixar, remover baixa, log e filtros.
- No fluxo `Adicionar` do modulo legado, foram observados como obrigatorios no formulario principal: Categoria, Conta, Descricao, Natureza, Vencimento e Valor.
- O mesmo fluxo exibiu campos/recursos complementares: Documento, Fornecedor, Forma de pagamento, Competencia, Pago em, opcao de pagar automaticamente no vencimento e seletor `Se repete?` com opcoes mensais/anuais/semanais/periodo informado.
- Diferente de alguns wizards v3 bloqueados por base vazia, o modal legado de Lancamentos apresentou listas amplas e populadas para Fornecedor e Formas de pagamento.
- Fluxo `Transferencia` validado no mesmo modulo (formulario `formTransferencia`) com obrigatorios: Conta de origem, Conta de destino, Vencimento, Valor e Descricao.
- Ao tentar salvar a transferencia sem preencher, o sistema exibiu modal de erro com mensagens explicitas: `Conta de origem e indispensavel`, `Conta de destino e indispensavel`, `Vencimento e indispensavel`, `Valor e indispensavel` e `Descricao e indispensavel`.
- No teste desta conta, os combos de transferencia vieram populados (origem com 20 opcoes e destino com 9 opcoes), permitindo continuidade tecnica do fluxo sem depender de cadastros vazios.
- Comparativo `Receita` x `Despesa` no formulario de `Adicionar`: mesma estrutura de campos visiveis e mesmos obrigatorios no estado inicial (Categoria, Conta, Descricao, Competencia, Natureza, Vencimento e Valor).
- Diferenca de interface validada: alternancia visual dos botoes de natureza (`Receita` em azul ativo e `Despesa` em vermelho ativo), sem alteracao de layout/campos no passo inicial.
- Validacao de obrigatorio no formulario padrao tambem confirmada durante a comparacao (mensagem imediata: `Conta e indispensavel!` ao tentar salvar sem preencher conta).
- Comparacao dinamica de recorrencia: ambos os modos exibiram o mesmo conjunto de opcoes em `Se repete?` (`Nao se repete`, `Sim, a cada mes`, `Sim, a cada ano`, `Sim, a cada semana`, `Informar periodo`) e mantiveram o mesmo conjunto de campos/obrigatorios visiveis no estado inicial.
- Em tentativa controlada de salvar vazio nos dois modos, a primeira mensagem retornada foi identica (`Conta e indispensavel!`), reforcando paridade de validacao basica entre Receita e Despesa nesta tela.

### 2.4.2 Contas a pagar - fluxo de criacao (validado na tela)

Pagina: https://app.simples.vet/v3/financeiro/contas-a-pagar e https://app.simples.vet/v3/financeiro/contas-a-pagar/adicionar

- Dashboard de saldos por status: Nao pagos, Pagos, Vencidos, A vencer e Todos.
- Filtros por descricao e periodo.
- Fluxo de criacao em wizard (3 etapas, com Dados basicos como etapa inicial 1/3).
- Campos observados no cadastro: categoria, fornecedor, descricao, vencimento e valor.
- Regra de recorrencia explicita no fluxo (campo: Esse lancamento se repete? Sim/Nao).
- Validacao observada no passo 1: ao avancar vazio, exibe "Revise os campos marcados em vermelho" antes de permitir seguir.

Observacoes adicionais desta rodada:

- Mesmo com preenchimento basico (categoria, fornecedor, descricao, vencimento e valor), o passo 1 ainda bloqueou avancar.
- Campos adicionais exibidos no mesmo passo indicam regra complementar de validacao, especialmente Competencia e Conta prevista para pagamento.
- Em nova tentativa de automacao, os combos de Categoria e Fornecedor tambem apareceram apenas com placeholder + opcao vazia, reforcando dependencia de cadastro/base de dados para avancar sem erro.
- Coleta complementar confirmou no passo 1 a exibicao de `Conta prevista para pagamento*` como seletor obrigatorio adicional (tambem sem opcoes utilizaveis nesta base), enquanto `Forma de pagamento prevista` apresentou lista completa de opcoes (boleto, cheque, deposito/transferencia, dinheiro, cartoes etc.).

## 2.5 Configuracao, site e relacionamento

- Configuracao da empresa: dados da empresa e parametros gerais. (validado por pagina)
- Usuarios: administracao de usuarios e acessos. (validado por pagina)
- Site: configuracoes de presenca digital e conteudo. (validado por pagina)
- Mensagens: historico e operacao de comunicacoes. (validado por pagina)
- Pesquisa de satisfacao (NPS): painel/metricas de satisfacao. (validado por rota de painel)

## 3) O que copiar como referencia no Salesmind (prioridade alta)

1. Compras orientado a nota fiscal com visao consolidada fiscal + fornecedor + itens + financeiro na mesma tela.
2. Fracionamento de produto no recebimento para converter unidade de compra em unidade de estoque.
3. Importacao XML com trilha de validacao e ajuste operacional antes de confirmar entrada.
4. Forma de pagamento parcelada integrada ao recebimento da compra.
5. Grade operacional com atalhos de visualizar, editar, excluir e impressao.

## 4) Pendencias remanescentes para proxima rodada

1. Teste guiado de upload XML real (arquivo de exemplo) para mapear todos os validadores da rotina.
2. Mapeamento das etapas finais dos wizards (passos 2..N) em Pedido de compra, Produtos e Servicos e Contas a pagar.
3. Rodar nova coleta em sessao com menor taxa de bloqueio HTTP 429 para capturar mensagens de validacao por campo nos passos seguintes.
4. Matriz de equivalencia final SimplesVet x Salesmind com backlog pronto por sprint e criterios de aceite por tela.
