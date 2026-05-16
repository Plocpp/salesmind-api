# LGPD - Checklist Tecnico Executavel

## Objetivo
Converter as diretrizes LGPD em tarefas de engenharia rastreaveis e priorizadas.

## Criticidade e prazos
- P0: iniciar imediatamente
- P1: concluir em ate 30 dias
- P2: concluir em ate 60 dias

## Backend
- [ ] P0 Criar endpoint interno para solicitacao de titular (DSR): acesso, correcao, eliminacao, portabilidade
- [ ] P0 Criar tabela de protocolo DSR com status, prazo e auditoria
- [ ] P0 Implementar redacao de PII em logs: email, telefone, cpf, cnpj, token
- [ ] P0 Bloquear persistencia de dados sensiveis em campos metadata via validacao
- [ ] P1 Criar politica de retencao por entidade com job de descarte/anonimizacao
- [ ] P1 Criar trilha de auditoria para acesso e alteracao de dados pessoais
- [ ] P1 Implementar rate limit em rotas de autenticacao e DSR
- [ ] P2 Implementar exportacao estruturada de dados do titular (formato JSON)

## Frontend
- [ ] P0 Publicar pagina de privacidade com finalidade, base legal e contato do encarregado
- [ ] P0 Criar area de solicitacoes LGPD no perfil (abrir e acompanhar DSR)
- [ ] P1 Exibir aviso de tratamento para campos com dados pessoais
- [ ] P1 Evitar exibicao de PII completa em listas (mascara por padrao)
- [ ] P2 Incluir historico de consentimento quando aplicavel ao fluxo

## Banco de Dados
- [ ] P0 Mapear campos de dados pessoais por tabela e classificar criticidade
- [ ] P0 Definir indices e controles para consultas seguras de DSR
- [ ] P1 Criar colunas de ciclo de vida de dado (origem, finalidade, retencao)
- [ ] P1 Criar rotina de anonimização para dados apos prazo de retencao
- [ ] P2 Revisar criptografia em repouso e segredos por ambiente

## Operacao e Governanca
- [ ] P0 Nomear encarregado e publicar canal oficial
- [ ] P0 Definir SLA de atendimento DSR e incidente
- [ ] P0 Executar simulacao de incidente com playbook
- [ ] P1 Treinamento interno de LGPD para equipe tecnica
- [ ] P1 Revisao juridica das bases legais mapeadas
- [ ] P2 Revisao trimestral de conformidade com evidencias versionadas

## Definicao de concluido
Uma tarefa LGPD so pode ser marcada como concluida quando:
1. Alteracao tecnica foi implementada e revisada
2. Evidencia foi registrada em docs
3. Risco residual foi avaliado
4. Dono e data de revisao foram definidos

## Evidencias obrigatorias
- Pull request da implementacao
- Atualizacao de inventario em docs/lgpd-registro-operacoes.md
- Atualizacao do programa em docs/lgpd-programa-adequacao.md
- Registro de decisao tecnica com data
