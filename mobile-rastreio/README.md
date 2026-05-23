# SalesMind Rastreio Mobile (Expo)

Aplicativo base para rastreio de entregador em segundo plano, integrado aos endpoints:

- `POST /rastreio/mobile/sessoes/iniciar`
- `POST /rastreio/mobile/sessoes/:sessaoId/pontos`
- `POST /rastreio/mobile/sessoes/:sessaoId/finalizar`

## 1) Instalar e rodar

```bash
npm install
npm run start
```

No Expo Go, use preferencialmente Android para testes de segundo plano.

## 2) Configurar API

Opcoes:

- Variavel de ambiente: `EXPO_PUBLIC_API_BASE_URL`
- Ou editar default em `src/tracking.ts`

Exemplo (PowerShell):

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="https://salesmind-api.onrender.com"
npm run start
```

## 3) Fluxo de uso

1. Criar dispositivo no painel web de rastreio e copiar o token gerado.
2. Inserir `entregadorId` e `token` no app.
3. Toque em **Iniciar**.
4. O app envia pontos periodicos em background.
5. Se ficar sem internet, os pontos entram em fila local segura.
6. Use **Sincronizar pendencias** quando a conexao voltar.
7. Toque em **Finalizar** para encerrar sessao.

## 4) Build instalavel (APK/AAB)

Para build distribuivel, use EAS:

```bash
npm install -g eas-cli
npx eas login
npm run eas:configure
npm run build:apk
```

Depois baixe o artefato no link retornado pelo EAS (APK instalavel de teste).

## 5) Observacoes de seguranca

- Token e sessao ficam em `expo-secure-store`.
- Pontos offline ficam em fila local e sao reenviados assim que possivel.
- O backend ja possui rate limit dedicado em `/rastreio/mobile/*`.
- Revogacao de dispositivo encerra sessoes ativas associadas.
