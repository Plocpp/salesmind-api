# Guia de Boas Práticas Sênior

Este guia resume as convenções que devem ser seguidas ao evoluir o SalesMind.

## 1. Princípios

1. Separar responsabilidade por camada.
2. Manter nomes explícitos e previsíveis.
3. Evitar lógica de negócio em controller.
4. Documentar decisões que afetem arquitetura, segurança ou dados.
5. Preservar compatibilidade quando houver base instalada em produção.

## 2. Estrutura recomendada

Backend:
- `src/app.ts` para composição da aplicação.
- `src/server.ts` para bootstrap do servidor.
- `src/routes/` para mapeamento HTTP.
- `src/controllers/` para adaptação HTTP.
- `src/services/` para regra de negócio.
- `src/schemas/` para contratos de entrada.
- `src/middlewares/` para autenticação, autorização e cross-cutting concerns.
- `src/utils/` para funções puras e reutilizáveis.

Frontend:
- `src/frontend/pages/` para telas completas.
- `src/frontend/components/` para componentes reutilizáveis.
- `src/frontend/services/` para cliente HTTP e integrações.
- `src/frontend/types/` para tipos compartilhados da UI.

## 3. Regras de código

1. Controllers devem validar apenas o básico e delegar o restante.
2. Services devem concentrar regra de negócio e checagens de domínio.
3. Acesso ao banco deve ser encapsulado por service ou repository.
4. Evitar funções com múltiplas responsabilidades.
5. Manter retorno consistente para facilitar consumo humano e de máquina.

## 4. Regras de API

1. Toda rota nova deve ter propósito claro e nome estável.
2. Endpoints críticos precisam de autenticação e autorização explícitas.
3. Erros devem ser previsíveis e sem vazamento de segredo.
4. Mudanças em payloads devem ser documentadas antes do deploy.

## 5. Regras de frontend

1. Telas críticas precisam de fallback visual e mensagens úteis.
2. Componentes reutilizáveis devem ficar isolados em `components`.
3. Páginas devem permanecer legíveis em desktop e mobile.
4. Cliente HTTP centralizado em um único ponto.

## 6. Regras de dados

1. Alteração de schema exige revisão de impacto.
2. Preferir migration versionada para mudanças persistentes.
3. Quando existir base em produção, evitar mudanças destrutivas no mesmo deploy.
4. Quando necessário, usar rollout compatível com versão anterior.

## 7. Regras de segurança

1. Segredos apenas em variáveis de ambiente.
2. Token de acesso com expiração curta.
3. Nunca registrar dados sensíveis em logs.
4. Autorizações por papel e por área devem estar visíveis no código.

## 8. Checklist mínimo antes de merge

- [ ] Código separado por camada correta
- [ ] Nome dos arquivos e símbolos claros
- [ ] Mudança documentada
- [ ] Erros revisados
- [ ] Build validado
- [ ] Fluxo crítico testado
- [ ] Impacto em produção analisado

## 9. Como decidir se algo ficou "sênior"

Perguntas objetivas:

1. Um humano consegue entender a intenção sem ler todo o código?
2. A responsabilidade está no lugar certo?
3. A mudança é fácil de testar e fácil de reverter?
4. O nome dos arquivos e funções ajuda ou atrapalha?
5. A documentação explica a decisão, não apenas o resultado?

Se a resposta for "sim" na maior parte, a solução está madura.