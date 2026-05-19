# ADR 001 - Hierarquia de Usuários e Permissões

## Status
Aprovado

## Contexto
O sistema precisava suportar uma hierarquia simples e previsível de usuários, com perfis predefinidos e ajuste fino de permissões pelo administrador.

Também era necessário manter a experiência humana simples para operação do time interno, sem expor regras de negócio no frontend nem exigir conhecimento técnico para uso diário.

## Decisão
Adotamos um modelo em duas camadas:

1. Papel base do usuário em `Usuario.role`.
2. Permissões complementares e revogáveis em tabelas de acesso sob controle do módulo de acessos.

Perfis predefinidos:
- ADMIN
- GERENTE
- VENDEDOR
- CAIXA
- ESTOQUISTA
- USER para estagiário ou acesso básico

Regras principais:
- ADMIN possui acesso total.
- GERENTE e demais perfis recebem áreas padrão.
- O administrador pode ampliar ou restringir áreas e dados permitidos por usuário.
- A interface administrativa deve ser simples, com seleção por perfil e ajustes rápidos.

## Consequências positivas
- Fica claro quem pode fazer o quê.
- O sistema continua legível para humanos.
- O admin consegue operar sem editar banco manualmente.
- A base suporta evolução futura de permissões granulares.

## Consequências negativas
- Existe alguma sobreposição entre role base e permissões adicionais.
- Mudanças em perfis exigem cuidado para não gerar inconsistência com acessos já concedidos.

## Regras de manutenção
- Toda alteração de perfil deve ser documentada.
- Mudanças de permissão devem passar por validação no service.
- Novas áreas do sistema precisam entrar no catálogo de áreas disponíveis.
- O frontend administrativo deve espelhar a estrutura do backend.

## Referências
- `src/services/acessos.service.ts`
- `src/controllers/acessos.controller.ts`
- `src/routes/acessos.routes.ts`
- `src/frontend/pages/UsuariosHierarquia.tsx`
