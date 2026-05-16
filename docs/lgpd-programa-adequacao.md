# Programa LGPD - SalesMind

## Objetivo
Estabelecer um padrao continuo de conformidade com LGPD para o produto e operacao.

Observacao: este documento orienta engenharia e operacao. Nao substitui assessoria juridica.

## Base normativa consultada
- Lei no 13.709/2018 (LGPD), texto compilado em Planalto
- Materiais institucionais da ANPD (orientacoes e comunicados)

Artigos-chave usados como referencia tecnica:
- Art. 6: principios (finalidade, necessidade, transparencia, seguranca, prevencao, accountability)
- Art. 7 e 11: bases legais para tratamento
- Art. 18 e 19: direitos do titular e prazo de resposta
- Art. 37: registro das operacoes de tratamento
- Art. 41: encarregado
- Art. 46 a 49: seguranca e comunicacao de incidentes
- Art. 50: boas praticas e governanca

## Diagnostico atual do sistema
## O que ja existe
- Controle de acesso por autenticacao JWT
- Middleware de tratamento de erro
- Endpoints de diagnostico e health
- Validacoes de payload em partes relevantes
- Modelo de dados estruturado via Prisma

## Lacunas para conformidade operacional
1. Ausencia de politica de privacidade versionada no produto
2. Ausencia de processo formal para atendimento de direitos do titular (DSR)
3. Ausencia de base legal explicitada por finalidade de tratamento
4. Ausencia de processo formal de retencao e descarte por tipo de dado
5. Ausencia de encarregado formalmente designado e publicado
6. Ausencia de padrao de mascaramento/anonimizacao em logs
7. Ausencia de playbook formal de incidente de dados com SLA

Conclusao objetiva:
- Sim, ja podemos iniciar LGPD imediatamente.
- Ainda nao e adequado afirmar conformidade plena.
- O caminho correto e adotar programa progressivo, com evidencias versionadas.

## Politica de execucao a partir de agora
Regra permanente para todo desenvolvimento novo:
1. Declarar finalidade do dado no PR
2. Declarar base legal da operacao
3. Coletar somente o minimo necessario
4. Definir prazo de retencao
5. Definir regra de descarte/anonimizacao
6. Definir quem acessa e por qual perfil
7. Atualizar inventario de tratamento

## Plano de adequacao em fases
## Fase 1 - Fundacao (0-30 dias)
1. Nomear encarregado e canal de contato
2. Publicar politica de privacidade e aviso de tratamento
3. Criar fluxo DSR (acesso, correcao, exclusao, portabilidade)
4. Ativar inventario de tratamento em docs/lgpd-registro-operacoes.md
5. Adotar mascara de PII em logs aplicacionais

## Fase 2 - Controles (31-60 dias)
1. Implementar endpoints internos para DSR
2. Implementar trilha de auditoria para operacoes de dados pessoais
3. Definir matriz de retencao por entidade
4. Implementar rotina de limpeza/anonimizacao em jobs
5. Revisar contratos com operadores (processadores)

## Fase 3 - Maturidade (61-90 dias)
1. Rodar avaliacao de risco e impacto (DPIA simplificado)
2. Simular incidente com o playbook
3. Revisar permissao por role com principio do menor privilegio
4. Publicar evidencias de governanca e revisao periodica

## Checklist de prontidao LGPD
- [ ] Encarregado definido e publicado
- [ ] Politica de privacidade publicada
- [ ] Base legal mapeada para cada finalidade
- [ ] Inventario de tratamento atualizado
- [ ] Processo DSR com SLA definido
- [ ] Processo de incidente de dados testado
- [ ] Politica de retencao e descarte ativa
- [ ] Mascara de PII em logs ativa
- [ ] Treinamento interno minimo concluido

## Mapeamento inicial de dados pessoais no projeto
Principais dados identificados:
- Usuario: nome, email, senha hash, refresh token
- Cliente: nome, telefone, email
- Cadastros auxiliares: cpf, telefone, email
- Fornecedor: cnpj, telefone, email
- Metadados livres em campos Json podem armazenar dados pessoais se nao houver controle

Risco tecnico relevante:
- Campos metadata e observacoes podem receber PII sem classificacao.

## Decisoes recomendadas imediatas
1. Bloquear armazenamento de dados sensiveis em metadata por validacao
2. Padronizar redacao de logs para email/telefone/cpf/cnpj
3. Definir tabela de solicitacoes do titular (DSR) com auditoria
4. Definir politica de retencao por entidade no banco

## Evidencias de conformidade
Toda evidencia deve ser versionada em docs:
- Inventario de operacoes
- Atas de revisao de risco
- Registro de incidentes e resposta
- Registro de atendimentos ao titular
