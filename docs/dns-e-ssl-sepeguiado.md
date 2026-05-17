# DNS e SSL Completo (sepeguiado)

Este guia cobre a publicacao de dominio e subdominios para frontend e API.

## Padrao oficial

- Frontend: `https://app.sepeguiado.com.br`
- API: `https://api.sepeguiado.com.br`
- Health API: `https://api.sepeguiado.com.br/health`

## Opcao A: Cloudflare (recomendado)

## 1) Adicionar dominio

1. Criar conta na Cloudflare.
2. Adicionar `sepeguiado.com.br`.
3. Copiar nameservers da Cloudflare.
4. No provedor do dominio, trocar NS para os nameservers da Cloudflare.
5. Aguardar propagacao (normalmente minutos, podendo levar horas).

## 2) Criar registros DNS

Use os valores abaixo e ajuste o destino real do seu host.

- Tipo `A` | Nome `api` | Conteudo `<IP_PUBLICO_DA_API>` | Proxy `ON`
- Tipo `CNAME` | Nome `app` | Conteudo `<HOST_FRONTEND_DO_PROVEDOR>` | Proxy `ON`

Notas:
- Se o frontend tambem estiver em IP proprio, pode usar `A` em vez de `CNAME`.
- Se o provedor exigir CNAME especifico (Vercel/Netlify), use o alvo informado por ele.

## 3) SSL/TLS na Cloudflare

1. Em SSL/TLS, usar modo `Full (strict)`.
2. Ativar `Always Use HTTPS`.
3. Ativar `Automatic HTTPS Rewrites`.

## 4) Certificado no host da API

Mesmo com Cloudflare, o host da API deve ter certificado valido para `api.sepeguiado.com.br`.

- Nginx/Caddy: emitir certificado Lets Encrypt para `api.sepeguiado.com.br`.
- Plataforma gerenciada: habilitar SSL custom domain no painel.

## Opcao B: Registro.br (DNS basico)

Se nao usar Cloudflare, crie registros diretamente no painel DNS do Registro.br:

- `A` para `api` apontando ao IP publico da API.
- `CNAME` para `app` apontando ao host do frontend.

Depois, no host de API/frontend, emitir certificados TLS para ambos os subdominios.

## Variaveis obrigatorias de ambiente

Backend (`.env.production`):

- `PUBLIC_BASE_URL=https://api.sepeguiado.com.br`
- `FRONTEND_BASE_URL=https://app.sepeguiado.com.br`

Frontend (`.env.frontend.production`):

- `VITE_API_BASE_URL=https://api.sepeguiado.com.br`

## Validacao final

1. `https://api.sepeguiado.com.br/health` retorna 200.
2. Frontend abre em `https://app.sepeguiado.com.br`.
3. Login funcional no frontend.
4. `npm run test:smoke` com `SMOKE_BASE_URL=https://api.sepeguiado.com.br`.
5. Public Smoke Test no GitHub Actions aprovado.
