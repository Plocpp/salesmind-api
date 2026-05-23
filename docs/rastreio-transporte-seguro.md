# Rastreio de Transporte Seguro (Android/iOS + LGPD)

## Objetivo
Criar um modulo de rastreio para entregadores com funcionamento em segundo plano no smartphone, com seguranca por dispositivo, trilha de localizacao e governanca LGPD.

## O que foi implementado nesta fase
- Backend novo em `/rastreio` com:
  - cadastro de dispositivo e token individual
  - revogacao de dispositivo
  - sessao de rastreio (iniciar, registrar ponto, finalizar)
  - consulta de sessoes ativas, ultima posicao e trilha de pontos
- Tela web inicial de operacao: `Rastreio Transporte`
- Tokens de dispositivo armazenados em hash (SHA-256), nunca em texto puro no banco.

## Endpoints
### Backoffice (JWT)
- `GET /rastreio/entregadores`
- `POST /rastreio/dispositivos`
- `GET /rastreio/dispositivos`
- `POST /rastreio/dispositivos/:id/revogar`
- `GET /rastreio/sessoes/ativas`
- `GET /rastreio/entregadores/:entregadorId/ultima-posicao`
- `GET /rastreio/sessoes/:sessaoId/pontos?limit=500`

### Mobile app (token de dispositivo)
- `POST /rastreio/mobile/sessoes/iniciar`
- `POST /rastreio/mobile/sessoes/:sessaoId/pontos`
- `POST /rastreio/mobile/sessoes/:sessaoId/finalizar`

## Arquitetura recomendada para o app mobile
### Stack sugerida
- React Native (Expo prebuild ou bare)
- Android: Fused Location Provider + foreground service
- iOS: Core Location com Background Modes (Location updates)

### Fluxo resumido
1. Backoffice gera token por dispositivo/entregador.
2. App mobile recebe token e inicia sessao de rastreio.
3. App envia pontos periodicos com latitude/longitude, precisao, bateria e timestamp.
4. Backoffice monitora entregadores ativos e pode revogar dispositivo/token.

## Seguranca recomendada
- Usar HTTPS obrigatorio (sem fallback HTTP).
- Token por dispositivo com rotacao periodica (ex.: 30 dias) e revogacao imediata.
- Armazenar somente hash do token no banco.
- Limite de taxa por token/dispositivo (rate limit dedicado para `/rastreio/mobile/*`).
- Assinatura de payload (HMAC) opcional para endurecer antifraude.
- Bloqueio de clock drift abusivo e validacao de coordenadas impossiveis.
- Auditoria de eventos: token criado, token revogado, sessao iniciada/finalizada.

## LGPD e transparencia (essencial)
- Informar claramente ao entregador quando o rastreio estiver ativo em segundo plano.
- Coletar apenas o minimo necessario (principio da necessidade).
- Definir base legal e finalidade no registro interno de operacoes.
- Aplicar retencao de dados (ex.: trilha detalhada por 90 dias, depois agregada/anonimizada).
- Permitir desligar rastreio fora da jornada operacional.

## Pesquisa tecnica usada (internet)
- Android Developers: acesso a localizacao em segundo plano e limites de bateria/politica.
- Apple Developer (Core Location): background updates, sessoes de autorizacao e comportamento em suspensao.
- MDN Geolocation: observacoes de permissao e contexto seguro (para fallback web, nao substitui app nativo em segundo plano).

## Proximos passos recomendados
1. Criar app mobile dedicado (Android/iOS) com permissao de localizacao em segundo plano.
2. Implementar polling inteligente de pontos:
   - em movimento: 5-15s
   - parado: 60-180s
3. Adicionar mapa em tempo real no painel web (Leaflet/Mapbox/Google Maps).
4. Criar alertas (entregador offline, bateria critica, desvio de rota).
5. Publicar politica interna de privacidade operacional e termo de ciencia para equipe de entrega.
