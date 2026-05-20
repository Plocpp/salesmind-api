# Setup Definitivo no Render - Passo a Passo

## Informações da Conexão Railway (já extraídas)

```
Host Público: autorack.proxy.rlwy.net
Porta: 18228
Database: railway
Usuario: root
Senha: CQXAjYPQUQchtCabIJOurZvmwYnSHGGb
```

**URL Completa:**
```
mysql://root:CQXAjYPQUQchtCabIJOurZvmwYnSHGGb@autorack.proxy.rlwy.net:18228/railway
```

---

## Passo 1: Acessar o Render

1. Vá para [render.com](https://render.com)
2. Faça login com GitHub
3. Abra o projeto **salesmind-api**

---

## Passo 2: Configurar as Variáveis de Ambiente

### 2.1 Abrir Settings da API

1. Clique em **salesmind-api** (serviço de backend)
2. Vá em **Environment** (ou **Settings** → **Environment Variables**)
3. Procure por `DATABASE_URL`

### 2.2 Adicionar/Atualizar Variáveis

**A.** `DATABASE_URL` (pode deixar como está ou remover - não é obrigatória)
```
(deixe em branco ou remova, pois usaremos DATABASE_URL_PUBLIC)
```

**B.** `DATABASE_URL_PUBLIC` (OBRIGATÓRIA - cole aqui)
```
mysql://root:CQXAjYPQUQchtCabIJOurZvmwYnSHGGb@autorack.proxy.rlwy.net:18228/railway
```

**C.** Outras variáveis obrigatórias (cole já que você tem):
- `JWT_ACCESS_SECRET` → gere uma string aleatória forte (ex: use um gerador)
- `JWT_REFRESH_SECRET` → outra string aleatória
- `ONBOARDING_WEBHOOK_TOKEN` → string aleatória
- `INTEGRACOES_ENCRYPTION_KEY` → string aleatória

**D.** Variáveis de Email (opcionais, mas recomendadas):
- `EMAIL_FROM` → seu email (ex: noreply@salesmind.com)
- `SMTP_USER` → seu email Outlook/Gmail
- `SMTP_PASS` → sua senha de app (não a senha normal!)

---

## Passo 3: Salvar e Fazer Deploy

1. Clique em **Save** (ou similar) após adicionar as variáveis
2. O Render vai detectar a mudança e fazer **redeploy automático**
3. Aguarde até que apareça ✅ **Live** no status

Observacao importante:
- Mantenha o build da API sem dependencia de banco para evitar falhas intermitentes de deploy.
- Em blueprint, use `buildCommand: npm ci && npx prisma generate`.
- Rode `npx prisma db push` e `npm run seed` manualmente no Shell da API apenas quando necessario.

---

## Passo 4: Validar a Conexão

### Teste 1: Health Check
```bash
curl https://salesmind-api.onrender.com/health
```

Resposta esperada:
```json
{"status":"ok"}
```

### Teste 2: Diagnostico Completo
```bash
curl https://salesmind-api.onrender.com/diagnostico/saude
```

Se retornar status 200 com info do sistema → ✅ **Banco conectado!**

### Teste 3: Smoke Test (completo)
```bash
# No seu computador, com a API já online:
npm run test:smoke
```

---

## Passo 5: Frontend (salesmind-app)

1. Abra o serviço **salesmind-app** no Render
2. Vá em **Environment**
3. Certifique-se que `VITE_API_BASE_URL` está como:
   ```
   https://salesmind-api.onrender.com
   ```
4. Clique **Save** e aguarde redeploy

---

## Troubleshooting

### ❌ Erro: "Connection timeout" ou "Can't connect to MySQL"

**Solução:**
- Verifique se a URL está **exatamente igual** (copie/cole novamente)
- Certifique-se de que `DATABASE_URL_PUBLIC` está preenchida (não `DATABASE_URL`)
- Aguarde 2-3 minutos após salvar (deploy pode levar)

### ❌ Erro 500 após login

**Solução:**
- Faltam variáveis: `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET`
- Clique em **View Logs** e procure por "JWT"

### ❌ Frontend não conecta na API

**Solução:**
- Verifique `VITE_API_BASE_URL` na config do frontend
- Deve ser `https://salesmind-api.onrender.com` (sem trailing slash)

---

## URLs Finais Esperadas

Após tudo pronto:
- **API:** https://salesmind-api.onrender.com
- **App:** https://salesmind-app.onrender.com

---

## Próximas Etapas (Opcional)

### CI/CD Automático (GitHub Actions)

Se quiser que todo `push` faça deploy automático:

1. Copie os **Deploy Hooks** do Render:
   - `salesmind-api` → Settings → Deploy Hook → copie URL
   - `salesmind-app` → Settings → Deploy Hook → copie URL

2. No GitHub (Settings → Secrets):
   ```
   RENDER_API_DEPLOY_HOOK=https://api.render.com/deploy/...
   RENDER_APP_DEPLOY_HOOK=https://api.render.com/deploy/...
   ```

3. Pronto! A partir de agora, cada `push` dispara deploy automático.

