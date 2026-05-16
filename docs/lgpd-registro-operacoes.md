# LGPD - Registro de Operacoes de Tratamento (Art. 37)

## Como usar
- Atualize este documento a cada nova coleta, novo uso ou novo compartilhamento de dados pessoais.
- Nao aprovar feature sem linha correspondente neste inventario.

## Inventario inicial
| Processo | Dado pessoal | Finalidade | Base legal proposta | Origem | Compartilhamento | Retencao proposta | Responsavel tecnico |
|---|---|---|---|---|---|---|---|
| Cadastro/Login de usuario | nome, email, senha hash, refresh token | autenticacao e gestao de conta | execucao de contrato; seguranca; obrigacao legal quando aplicavel | formulario de cadastro/login | nao mapeado formalmente | enquanto conta ativa + prazo legal aplicavel | Backend/Auth |
| Cadastro de cliente | nome, telefone, email | viabilizar vendas e contato operacional | execucao de contrato; legitimo interesse com balanco documentado | cadastro manual interno | nao mapeado formalmente | politica pendente | Backend/Vendas |
| Cadastro de fornecedor | cnpj, telefone, email, endereco | relacionamento comercial e compras | execucao de contrato; obrigacao legal/fiscal quando aplicavel | cadastro manual interno | nao mapeado formalmente | politica pendente | Backend/Cadastros |
| Fluxo de orcamento por email | email do destinatario | envio de proposta comercial | execucao de procedimentos preliminares a contrato | tela de vendas | provedor de email (quando configurado) | politica pendente | Backend/Vendas |
| Logs e diagnostico | identificadores tecnicos e possivel PII em erro bruto | observabilidade e suporte | legitimo interesse com minimizacao | aplicacao | nao mapeado formalmente | curto prazo com redacao | Plataforma |

## Campos com risco de sobrecoleta
- Campos Json metadata em modulos de vendas/financeiro/estoque
- Campos observacoes livres

## Regras minimas obrigatorias
1. Nao registrar senha, token, cpf completo ou cartao em logs
2. Nao usar metadata para dado sensivel
3. Toda nova integracao deve declarar operador/controlador
4. Toda nova coleta deve declarar prazo de retencao

## Pendencias criticas
- [ ] Formalizar base legal por processo com validacao juridica
- [ ] Definir prazos de retencao por tabela
- [ ] Definir rotina de descarte/anonimizacao
- [ ] Definir matriz de acesso por perfil
