# Guia de Alterações Futuras (Padrão do Time)

Este guia define como alterar o sistema com previsibilidade, reduzindo regressões e facilitando manutenção.

## 1) Padrão por tipo de mudança

## Backend (rotas, controllers, services)

1. Criar ou ajustar regra no service.
2. Expor no controller apenas o necessário para HTTP.
3. Registrar rota em `src/app.ts` quando for novo módulo.
4. Garantir autenticação/autorização adequada.
5. Atualizar smoke test quando um endpoint crítico mudar.

## Frontend (páginas e fluxo de negócio)

1. Centralizar chamadas no cliente HTTP existente.
2. Exibir erro técnico claro para facilitar suporte.
3. Em telas críticas (Vendas, Financeiro), manter fallback visual e diagnóstico.
4. Revalidar responsividade mobile após mudança.

## Banco de dados

1. Avaliar impacto de schema antes de codar.
2. Preferir rollout compatível com versão anterior.
3. Rodar validação local:
   - `npx prisma db push`
   - `npm run seed` (quando aplicável)

## 2) Critérios de aceite mínimos

Toda mudança deve passar em:

1. `npm run test:smoke`
2. `npm run test:onboarding-acesso` (quando afetar auth/onboarding)
3. `npm run build:all`
4. Pipeline `Pre-Deploy Validation` no GitHub Actions

## 3) Definição de pronto para PR

1. Escopo da mudança descrito no PR.
2. Risco e impacto documentados.
3. Endpoints afetados listados.
4. Plano de rollback informado.
5. Evidência de testes anexada.

## 4) Convenções importantes do projeto

1. Não acoplar regra de negócio no controller.
2. Evitar query SQL direta sem necessidade.
3. Preservar compatibilidade com banco legado quando aplicável.
4. Em callbacks de classe usados como handler Express, garantir bind de contexto (`this`).
5. Não remover fallback de observabilidade em módulos críticos.

## 5) Mudanças sensíveis (exigem revisão reforçada)

- autenticação e autorização
- fluxo de vendas e caixa
- integração com provedores externos
- onboarding e ativação de acesso
- criptografia e segredos
- estrutura de tabelas principais

## 6) Template de checklist para usar em PR

Copiar e preencher no PR:

- [ ] Escopo da mudança está claro
- [ ] Impacto em banco avaliado
- [ ] Impacto em endpoints mapeado
- [ ] Smoke test executado com sucesso
- [ ] Teste onboarding executado (se aplicável)
- [ ] Build de produção executado
- [ ] Plano de rollback definido
- [ ] Documentação atualizada

## 7) Rotina de revisão trimestral

A cada trimestre:

1. Revisar variáveis de ambiente e segredos.
2. Revisar pipeline de validação e deploy.
3. Revisar cobertura do smoke test por módulo.
4. Revisar endpoints de diagnóstico e alertas.
5. Atualizar este guia com lições aprendidas.
