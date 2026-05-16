# LGPD - Playbook de Incidente de Dados

## Objetivo
Padronizar resposta a incidente de seguranca com potencial risco aos titulares, conforme LGPD (Art. 46 a 49).

## Definicao de incidente
Qualquer evento com possibilidade de:
- acesso nao autorizado
- perda, alteracao, destruicao ou vazamento de dados pessoais
- indisponibilidade relevante com impacto em direitos de titulares

## Niveis de severidade
- SEV-1: alto impacto, dados pessoais expostos ou forte indicio de exposicao
- SEV-2: impacto moderado, risco controlado
- SEV-3: baixo impacto, sem evidencia de exposicao

## Fluxo de resposta
1. Detectar e registrar incidente
2. Conter impacto (isolar servico/chave/credencial)
3. Preservar evidencias tecnicas
4. Avaliar escopo de dados afetados
5. Acionar responsaveis internos
6. Definir comunicacao a titulares e ANPD quando houver risco ou dano relevante
7. Remediar causa raiz
8. Publicar relatorio pos-incidente e acoes corretivas

## RACI minimo
- Incident Commander: lider tecnico de plantao
- Seguranca/Plataforma: contencao e forense tecnica
- Produto/Negocio: impacto funcional e comunicacao operacional
- Juridico/Compliance: avaliacao de obrigacao de notificacao
- Encarregado: interface com titulares e ANPD

## Checklist de resposta (primeiras 24h)
- [ ] Abrir ticket de incidente com hora de deteccao
- [ ] Identificar sistemas e bases afetadas
- [ ] Bloquear vetores ativos (token, senha, endpoint)
- [ ] Levantar dados potencialmente afetados
- [ ] Classificar severidade
- [ ] Registrar decisoes e evidencias
- [ ] Definir necessidade de notificacao externa

## Modelo de registro de incidente
| Campo | Valor |
|---|---|
| ID do incidente | |
| Data/hora deteccao | |
| Sistema afetado | |
| Tipo de incidente | |
| Dados potencialmente afetados | |
| Volume estimado | |
| Causa raiz preliminar | |
| Medidas de contencao | |
| Risco ao titular | |
| Notificacao ANPD | sim/nao |
| Notificacao titulares | sim/nao |
| Responsavel | |
| Status | |

## Melhorias obrigatorias apos incidente
1. Registrar lessons learned em ate 5 dias uteis
2. Criar plano de acao com prazo e dono
3. Validar eficacia da correcao em ambiente real
4. Atualizar inventario LGPD e controles preventivos
