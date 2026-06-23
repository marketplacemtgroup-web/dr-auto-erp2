# Arquivos e configurações por instância

Guia para **atualizar manualmente** outro sistema (outra oficina) com o código novo deste repositório **sem perder** nome, logos, segredos, Firebase, Supabase e dados.

**Regra de ouro:** código = compartilhado · dados e identidade = **por oficina**.

---

## Índice

1. [O que NÃO sobrescrever](#1-o-que-não-sobrescrever)
2. [Arquivos `.env`](#2-arquivos-env)
3. [Imagens PNG e ícones](#3-imagens-png-e-ícones)
4. [Firebase (push Android)](#4-firebase-push-android)
5. [Web Push / VAPID (portal PWA no navegador)](#5-web-push--vapid-portal-pwa-no-navegador)
6. [Supabase (nuvem — não é arquivo no PC)](#6-supabase-nuvem--não-é-arquivo-no-pc)
7. [Vercel (variáveis na nuvem)](#7-vercel-variáveis-na-nuvem)
8. [Arquivos de marca no código (textos)](#8-arquivos-de-marca-no-código-textos)
9. [Apps Android — pacote, nome e URLs](#9-apps-android--pacote-nome-e-urls)
10. [O que pode ignorar na migração](#10-o-que-pode-ignorar-na-migração)
11. [Checklist rápido antes de atualizar](#11-checklist-rápido-antes-de-atualizar)
12. [Ordem sugerida (update manual)](#12-ordem-sugerida-update-manual)

---

## 1. O que NÃO sobrescrever

Ao copiar código deste repositório para outra oficina, **preserve** desta outra instância:

| Categoria | Onde fica |
|-----------|-----------|
| Segredos e URLs | Todos os `.env` (lista abaixo) |
| Banco de dados | Projeto Supabase exclusivo da oficina |
| Logos e ícones | PNGs/WebPs listados na seção 3 |
| Firebase Android | `google-services.json` + projeto Firebase |
| Firebase API | `FIREBASE_SERVICE_ACCOUNT` na Vercel |
| Push web (PWA) | `VAPID_*` na API |
| Deploy | 3 projetos Vercel + variáveis de cada um |
| Dados no banco | Clientes, OS, financeiro, logo salvo em Configurações |

---

## 2. Arquivos `.env`

Os `.env` **não vão para o Git** (estão no `.gitignore`). Cada oficina tem os seus.

### 2.1 Lista completa de arquivos

| Arquivo | Quem usa |
|---------|----------|
| `.env` | Raiz — referência geral / Supabase |
| `.env.local` | Overrides locais (raiz) |
| `packages/database/.env` | Prisma — `db:deploy`, migrations |
| `apps/api/.env` | API NestJS local |
| `app/.env` | ERP (Vite, porta 3000) |
| `app/.env.local` | ERP — overrides locais |
| `apps/portal/.env` | Portal web (porta 3001) |
| `APLICATIVO PORTAL CLIENTE/.env` | App Android — portal do cliente |
| `APLICATIVO COLABORADOR/.env` | App Android — colaborador |
| `APLICATIVO OFICINA/.env` | App Android — oficina interna |

### 2.2 Modelos (só referência — não são segredos)

| Arquivo | Uso |
|---------|-----|
| `.env.example` | Desenvolvimento local (Docker) |
| `.env.supabase.example` | Produção com Supabase |
| `apps/portal/.env.example` | Portal |
| `apps/portal/.env.development` | Dev do portal |
| `APLICATIVO PORTAL CLIENTE/.env.example` | App portal |
| `APLICATIVO COLABORADOR/.env.example` | App colaborador |
| `APLICATIVO OFICINA/.env.example` | App oficina |

### 2.3 Variáveis importantes — API / banco

Copiar o **mesmo conteúdo** para `.env`, `packages/database/.env` e `apps/api/.env` (mesmo `[ref]` Supabase):

| Variável | Por oficina? | Nota |
|----------|--------------|------|
| `DATABASE_URL` | **Sim** | Pooler Supabase porta 6543 |
| `DIRECT_URL` | **Sim** | Direct porta 5432 (migrations) |
| `SUPABASE_URL` | **Sim** | `https://[ref].supabase.co` |
| `SUPABASE_ANON_KEY` | **Sim** | Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sim** | Settings → API |
| `JWT_SECRET` | **Sim** | String longa e única por oficina |
| `JWT_EXPIRES_IN` | Pode igualar | Ex.: `7d` |
| `CORS_ORIGIN` | **Sim** | URLs do ERP e Portal da oficina |
| `SINGLE_TENANT` | Geralmente `true` | |
| `DEFAULT_ORGANIZATION_NAME` | **Sim** | Nome da oficina |
| `API_PORT` | Local | `4000` |
| `REDIS_URL` | Local/Docker | |
| `NODE_ENV` | Vercel | `production` |

### 2.4 Variáveis — ERP (`app/.env`)

| Variável | Por oficina? | Exemplo |
|----------|--------------|---------|
| `VITE_API_URL` | **Sim** | `https://oficina-xyz-api.vercel.app` |
| `VITE_PORTAL_URL` | **Sim** | `https://oficina-xyz-portal.vercel.app` |
| `VITE_APP_NAME` | **Sim** | `OFICINA XYZ` |
| `VITE_APP_TAGLINE` | **Sim** | `OFICINA MECÂNICA` |
| `VITE_DEFAULT_ORGANIZATION_NAME` | **Sim** | `OFICINA XYZ` |
| `VITE_SINGLE_TENANT` | Geralmente `true` | |
| `VITE_CONTACT_WHATSAPP` | **Sim** | `5511999999999` (opcional) |

### 2.5 Variáveis — Portal (`apps/portal/.env`)

| Variável | Por oficina? | Exemplo |
|----------|--------------|---------|
| `VITE_API_URL` | **Sim** | URL da API (sem `/api` no final) |
| `VITE_DASHBOARD_URL` | **Sim** | URL do ERP |
| `VITE_APP_NAME` | **Sim** | Nome da oficina |
| `VITE_APP_TAGLINE` | Pode personalizar | `Portal do Cliente` |
| `VITE_BRAND_LOGO_URL` | **Sim** | `/logo-oficinadobeto.png` ou seu arquivo |
| `VITE_BRAND_BACKGROUND_URL` | **Sim** | `/oficina do beto.png` ou seu arquivo |
| `VITE_CONTACT_WHATSAPP` | **Sim** | Opcional |

### 2.6 Variáveis — App Portal Cliente (`APLICATIVO PORTAL CLIENTE/.env`)

| Variável | Por oficina? | Exemplo |
|----------|--------------|---------|
| `PORTAL_API_URL` | **Sim** | `https://oficina-xyz-api.vercel.app/api/` |
| `PORTAL_DEEP_LINK_HOST` | **Sim** | `oficina-xyz-portal.vercel.app` |

### 2.7 Variáveis — App Colaborador (`APLICATIVO COLABORADOR/.env`)

| Variável | Por oficina? | Exemplo |
|----------|--------------|---------|
| `API_BASE_URL` | **Sim** | `https://oficina-xyz-api.vercel.app/api/` |

### 2.8 Variáveis — App Oficina (`APLICATIVO OFICINA/.env`)

| Variável | Por oficina? | Exemplo |
|----------|--------------|---------|
| `API_BASE_URL` | **Sim** | `https://oficina-xyz-api.vercel.app/api/` |
| `USE_MOCK_DATA` | Dev | `false` |

### 2.9 Sincronizar `.env` dentro da mesma instância

Na raiz do projeto (uma oficina só):

```powershell
npm run env:sync
```

Copia `.env` da raiz para `packages/database`, `apps/api` e mescla `VITE_*` em `app/.env`.  
**Não use** isso entre oficinas diferentes.

### 2.10 Ao atualizar código: mesclar `.env`, não substituir

1. Compare `.env.example` ou `.env.supabase.example` **novo** com o `.env` **antigo** da outra oficina.
2. **Adicione** variáveis novas que passaram a existir no código.
3. **Mantenha** `DATABASE_URL`, `SUPABASE_*`, `JWT_SECRET`, URLs da Vercel daquela oficina.

---

## 3. Imagens PNG e ícones

### 3.1 ERP (dashboard web)

Pasta: `app/public/`

| Arquivo | Função |
|---------|--------|
| `logo-oficinadobeto.png` | Logo principal, favicon, PWA |
| `favicon.png` | Ícone 32×32 |
| `favicon.ico` | Ícone clássico (se existir) |

Referenciado em: `app/index.html`, `app/vite.config.ts`, `app/public/manifest.webmanifest`, `app/src/lib/branding.ts`

### 3.2 Portal web

Pasta: `apps/portal/public/`

| Arquivo | Função |
|---------|--------|
| `logo-oficinadobeto.png` | Logo principal / favicon / PWA |
| `oficina do beto.png` | Fundo da tela de login |
| `oficina-dobeto.png` | Variante de fundo |
| `branding/logo.png` | Legado / compatibilidade |
| `favicon.png` | Ícone |
| `favicon.ico` | Ícone clássico (se existir) |

Referenciado em: `apps/portal/index.html`, `apps/portal/vite.config.ts`, `apps/portal/src/lib/branding.ts`, `apps/portal/public/push-sw.js`

### 3.3 App Android — Portal Cliente

| Caminho | Função |
|---------|--------|
| `app/src/main/res/drawable/logo_oficina_beto.png` | Logo na UI |
| `app/src/main/res/drawable-nodpi/bg_oficina_beto.png` | Fundo |
| `app/src/main/res/mipmap-mdpi/ic_launcher.png` | Ícone do app |
| `app/src/main/res/mipmap-mdpi/ic_launcher_round.png` | Ícone redondo |
| `app/src/main/res/mipmap-hdpi/ic_launcher.png` | Ícone |
| `app/src/main/res/mipmap-hdpi/ic_launcher_round.png` | Ícone redondo |
| `app/src/main/res/mipmap-xhdpi/ic_launcher.png` | Ícone |
| `app/src/main/res/mipmap-xhdpi/ic_launcher_round.png` | Ícone redondo |
| `app/src/main/res/mipmap-xxhdpi/ic_launcher.png` | Ícone |
| `app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png` | Ícone redondo |
| `app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` | Ícone |
| `app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png` | Ícone redondo |

(Repetir estrutura `mipmap-*` para as 5 densidades: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)

### 3.4 App Android — Colaborador

| Caminho | Função |
|---------|--------|
| `app/src/main/res/drawable/logo_oficina_beto.png` | Logo |
| `app/src/main/res/drawable-nodpi/bg_oficina_beto.png` | Fundo |
| `app/src/main/res/mipmap-*/ic_launcher.webp` | Ícone do app (WebP, não PNG) |
| `app/src/main/res/mipmap-*/ic_launcher_round.webp` | Ícone redondo |

### 3.5 App Android — Oficina interna

| Caminho | Função |
|---------|--------|
| `app/src/main/res/drawable/logo_oficina_beto.png` | Logo |
| `app/src/main/res/drawable-nodpi/bg_oficina_beto.png` | Fundo |
| `app/src/main/res/mipmap-*/ic_launcher.png` | Ícone |
| `app/src/main/res/mipmap-*/ic_launcher_round.png` | Ícone redondo |

### 3.6 Branding também no banco

Depois do `/cadastro`, nome, logo e cores podem ser alterados em **Configurações** no ERP (salvos no Supabase Storage + banco).  
Os arquivos estáticos acima controlam favicon, PWA e fallback antes do login.

---

## 4. Firebase (push Android)

Push nativo no **App Portal Cliente** exige **dois lados** no **mesmo projeto Firebase**:

| Lado | O quê | Função |
|------|-------|--------|
| **Celular** | `google-services.json` | App **recebe** push (FCM) |
| **API (Vercel)** | `FIREBASE_SERVICE_ACCOUNT` | Servidor **envia** push |

> O Colaborador e o App Oficina **não usam Firebase** neste momento — só o Portal Cliente.

### 4.1 Arquivo no app Android

| Arquivo | Local |
|---------|-------|
| `google-services.json` | `APLICATIVO PORTAL CLIENTE/app/google-services.json` |

- **Não commitar** no Git (segredo / config por instância).
- Se trocar de projeto Firebase: baixe novo JSON no Console e **rebuild do APK**.
- O `package_name` dentro do JSON deve bater com o `applicationId` do app.

**Oficina do Beto (referência):**

- Projeto Firebase: `oficina-do-beto-campinas`
- Package Android: `com.aistudio.portalcliente.wypbzx`
- Definido em: `APLICATIVO PORTAL CLIENTE/app/build.gradle.kts` → `applicationId`

### 4.2 Variáveis na API

No `apps/api/.env` (local) e na **Vercel** (projeto API):

| Variável | Descrição |
|----------|-----------|
| `FIREBASE_SERVICE_ACCOUNT` | JSON da conta de serviço (Admin SDK) em **uma linha** |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Alternativa se a Vercel truncar o JSON |

**Importante:** o `current_key` dentro do `google-services.json` **não serve** para a API.  
Você precisa da **conta de serviço** (Service Account).

### 4.3 Como gerar `FIREBASE_SERVICE_ACCOUNT`

1. Firebase Console → seu projeto → **Configurações** → **Contas de serviço**.
2. **Gerar nova chave privada** → salvar o `.json` (não commitar).
3. Na raiz do repositório:

```powershell
node scripts/setup-firebase-fcm.mjs "C:\caminho\firebase-adminsdk-xxxxx.json"
```

4. Copie o valor de `FIREBASE_SERVICE_ACCOUNT=...` para a Vercel.

Se truncar na Vercel:

```powershell
node scripts/setup-firebase-fcm.mjs --base64 "C:\caminho\firebase-adminsdk-xxxxx.json"
```

Use `FIREBASE_SERVICE_ACCOUNT_BASE64` na Vercel.

### 4.4 Conferir se Firebase está OK

Após redeploy da API:

```
GET https://SUA-API.vercel.app/api/env-check
```

Deve retornar `"firebaseFcm": true` dentro de `push`.

### 4.5 Checklist Firebase por oficina

| # | Item |
|---|------|
| 1 | Projeto Firebase exclusivo (ou app Android separado no mesmo console) |
| 2 | `google-services.json` em `APLICATIVO PORTAL CLIENTE/app/` |
| 3 | `package_name` = `applicationId` do `build.gradle.kts` |
| 4 | Conta de serviço baixada (Admin SDK) |
| 5 | `FIREBASE_SERVICE_ACCOUNT` (ou `_BASE64`) na Vercel — projeto API |
| 6 | Redeploy da API |
| 7 | `env-check` → `firebaseFcm: true` |
| 8 | APK novo instalado + login + permissão de notificação |
| 9 | App e API no **mesmo** `project_id` Firebase |

Documentação detalhada: [`APLICATIVO PORTAL CLIENTE/PUSH_SETUP.md`](../APLICATIVO%20PORTAL%20CLIENTE/PUSH_SETUP.md)

### 4.6 Código Android relacionado ao FCM

| Arquivo | Função |
|---------|--------|
| `app/build.gradle.kts` | Plugin `google-services`, dependência Firebase Messaging |
| `app/src/main/AndroidManifest.xml` | Canal `portal_alerts_v2`, ícone de notificação |
| `services/PortalMessagingService.kt` | Recebe push com app aberto |
| `services/PortalFcmManager.kt` | Registra token na API |
| `services/PortalBootReceiver.kt` | Re-registra token após reboot |

---

## 5. Web Push / VAPID (portal PWA no navegador)

Push no **navegador** (PWA do portal), separado do Firebase Android.

### 5.1 Variáveis na API

No `apps/api/.env` e na Vercel (projeto API):

| Variável | Por oficina? | Como gerar |
|----------|--------------|------------|
| `VAPID_PUBLIC_KEY` | **Sim** (recomendado) | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | **Sim** | idem |
| `VAPID_SUBJECT` | **Sim** | `mailto:contato@oficina-xyz.com.br` |

### 5.2 Arquivos que usam o logo no push web

| Arquivo | O quê |
|---------|-------|
| `apps/portal/public/push-sw.js` | Ícone da notificação + título padrão |
| `app/public/push-sw.js` | Idem no ERP (se usar push no dashboard) |

Ao trocar nome da oficina, revise o texto padrão em `push-sw.js` (ex.: `title: 'OFICINA DO BETO'`).

---

## 6. Supabase (nuvem — não é arquivo no PC)

Cada oficina = **um projeto Supabase exclusivo**. Não compartilhe banco entre oficinas.

| O quê | Onde configurar |
|-------|-----------------|
| Postgres | `DATABASE_URL` + `DIRECT_URL` nos `.env` |
| Storage (fotos OS) | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
| Buckets | SQL: `scripts/supabase-storage-buckets.sql` |

Após atualizar código com migrations novas:

```powershell
npm run db:deploy
```

Isso altera **só a estrutura** do banco daquela oficina — não apaga clientes/OS.

**Nunca** rode `db:reset` em produção.

Guias: [`NOVA-INSTANCIA-OFICINA.md`](../NOVA-INSTANCIA-OFICINA.md), [`docs/SUPABASE-PRODUCAO.md`](SUPABASE-PRODUCAO.md)

---

## 7. Vercel (variáveis na nuvem)

Cada oficina = **3 projetos Vercel** no mesmo repositório Git:

| Projeto | Root Directory | URL exemplo |
|---------|----------------|-------------|
| API | `apps/api` | `https://oficina-xyz-api.vercel.app` |
| ERP | `app` | `https://oficina-xyz-erp.vercel.app` |
| Portal | `apps/portal` | `https://oficina-xyz-portal.vercel.app` |

### 7.1 Variáveis — projeto API (Production)

| Variável | Obrigatória |
|----------|-------------|
| `DATABASE_URL` | Sim |
| `DIRECT_URL` | Sim (migrations locais) |
| `JWT_SECRET` | Sim |
| `JWT_EXPIRES_IN` | Sim |
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim |
| `SINGLE_TENANT` | `true` |
| `CORS_ORIGIN` | URLs ERP + Portal |
| `DEFAULT_ORGANIZATION_NAME` | Nome da oficina |
| `VAPID_PUBLIC_KEY` | Se usar push PWA |
| `VAPID_PRIVATE_KEY` | Se usar push PWA |
| `VAPID_SUBJECT` | Se usar push PWA |
| `FIREBASE_SERVICE_ACCOUNT` | Se usar push Android |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Alternativa ao JSON |

### 7.2 Variáveis — projeto ERP (build)

| Variável |
|----------|
| `VITE_API_URL` |
| `VITE_PORTAL_URL` |
| `VITE_APP_NAME` |
| `VITE_APP_TAGLINE` |
| `VITE_SINGLE_TENANT` |
| `VITE_DEFAULT_ORGANIZATION_NAME` |
| `VITE_CONTACT_WHATSAPP` (opcional) |

### 7.3 Variáveis — projeto Portal (build)

| Variável |
|----------|
| `VITE_API_URL` |
| `VITE_DASHBOARD_URL` |
| `VITE_APP_NAME` |
| `VITE_APP_TAGLINE` (opcional) |
| `VITE_BRAND_LOGO_URL` (opcional) |
| `VITE_BRAND_BACKGROUND_URL` (opcional) |
| `VITE_CONTACT_WHATSAPP` (opcional) |

Guia completo: [`docs/DEPLOY-VERCEL.md`](DEPLOY-VERCEL.md)

---

## 8. Arquivos de marca no código (textos)

Se quiser personalizar nome/contato **no código** (além do `.env` e do banco):

### 8.1 Web

| Arquivo | O quê mudar |
|---------|-------------|
| `app/src/lib/branding.ts` | Nome fallback, e-mail impressão, WhatsApp |
| `apps/portal/src/lib/branding.ts` | Nome fallback, fundo, horário suporte |
| `app/index.html` | `<title>`, favicon, PWA |
| `apps/portal/index.html` | idem |
| `app/public/manifest.webmanifest` | `name`, `short_name` |
| `apps/portal/public/manifest.webmanifest` | idem |
| `app/vite.config.ts` | Bloco PWA → `manifest.name` |
| `apps/portal/vite.config.ts` | idem |
| `app/public/push-sw.js` | Título padrão da notificação |
| `apps/portal/public/push-sw.js` | idem |
| `app/src/lib/routes.ts` | URLs legadas do portal (`LEGACY_PORTAL_URLS`) |

### 8.2 Apps Android

| Arquivo | O quê mudar |
|---------|-------------|
| `APLICATIVO PORTAL CLIENTE/app/src/main/res/values/strings.xml` | `app_name` |
| `APLICATIVO PORTAL CLIENTE/app/src/main/java/com/example/lib/PortalBranding.kt` | `APP_NAME` fallback |
| `APLICATIVO COLABORADOR/app/src/main/res/values/strings.xml` | `app_name` |
| `APLICATIVO COLABORADOR/app/src/main/java/com/example/Branding.kt` | Nome e cores fallback |
| `APLICATIVO OFICINA/app/src/main/res/values/strings.xml` | `app_name` |
| `APLICATIVO OFICINA/app/src/main/java/com/example/ui/config/Branding.kt` | Nome, cores, slogan |

### 8.3 API (mensagens padrão)

| Arquivo | O quê |
|---------|-------|
| `apps/api/src/auth/auth.service.ts` | Textos de e-mail/setup |
| `apps/api/src/push/push.service.ts` | `VAPID_SUBJECT` fallback |

Inventário completo de referências à marca: [`docs/MAPEAMENTO-MARCA-OFICINA-BETO.md`](MAPEAMENTO-MARCA-OFICINA-BETO.md)

---

## 9. Apps Android — pacote, nome e URLs

Cada oficina pode manter o **mesmo código** com configs diferentes:

| App | `applicationId` (referência Beto) | `.env` principal |
|-----|-----------------------------------|------------------|
| Portal Cliente | `com.aistudio.portalcliente.wypbzx` | `PORTAL_API_URL`, `PORTAL_DEEP_LINK_HOST` |
| Colaborador | `com.aistudio.betomecanica.colab` | `API_BASE_URL` |
| Oficina | (ver `APLICATIVO OFICINA/app/build.gradle.kts`) | `API_BASE_URL` |

Se criar **novo app** na Play Store / Firebase para outra oficina, mude o `applicationId` e gere novo `google-services.json`.

---

## 10. O que pode ignorar na migração

| Pasta/arquivo | Motivo |
|---------------|--------|
| `app/dist/`, `apps/portal/dist/` | Build gerado |
| `**/build/`, `**/.gradle/` | Build Android |
| `apps/api/uploads/**` | Fotos enviadas pelos usuários |
| `**/app/src/test/screenshots/` | Testes |
| `APLICATIVO COLABORADOR/public/Screenshot_*.png` | Prints de exemplo |
| `docs/logo wtecmotors.png`, `LOGO WTEC APP.png` | Legado |
| `public/1000504*.png`, `fullpage.png`, `screenshot.png` (raiz) | Lixo/legado |

---

## 11. Checklist rápido antes de atualizar

Faça backup da outra oficina:

- [ ] Export/backup do Supabase
- [ ] Copiar todos os `.env` para pasta segura
- [ ] Copiar `APLICATIVO PORTAL CLIENTE/app/google-services.json`
- [ ] Copiar logos PNG/WebP (seção 3)
- [ ] Anotar variáveis da Vercel (API, ERP, Portal)
- [ ] Anotar `project_id` Firebase e `applicationId` Android

Depois de atualizar o código:

- [ ] Mesclar `.env` (adicionar variáveis novas, manter segredos antigos)
- [ ] `npm run db:deploy` no banco **daquela** oficina
- [ ] Conferir `GET /api/ping` e `GET /api/env-check`
- [ ] Redeploy Vercel (API → ERP → Portal)
- [ ] Rebuild APK se mudou Firebase ou `.env` do app
- [ ] Testar login ERP, portal, upload de foto, push (se usar)

---

## 12. Ordem sugerida (update manual)

1. **Backup** — `.env`, `google-services.json`, PNGs, Vercel, Supabase.
2. **Código** — copie/merge do repositório novo; **não** sobrescreva os itens da seção 1.
3. **`.env`** — mescle variáveis novas; preserve URLs e chaves da oficina.
4. **Banco** — `npm run db:deploy` (só na instância correta).
5. **Firebase** — se a outra oficina já tinha Firebase, mantenha o dela; se não tinha e quer push, configure seção 4.
6. **VAPID** — se a outra oficina usa push PWA, mantenha ou gere novas chaves (seção 5).
7. **Vercel** — adicione variáveis novas; redeploy dos 3 projetos.
8. **Teste** — ERP, portal, Android, push, impressão com logo certo.

---

## Documentos relacionados

| Documento | Conteúdo |
|-----------|----------|
| [`NOVA-INSTANCIA-OFICINA.md`](../NOVA-INSTANCIA-OFICINA.md) | Criar oficina do zero |
| [`docs/DEPLOY-VERCEL.md`](DEPLOY-VERCEL.md) | Deploy API + ERP + Portal |
| [`docs/PROMPT-MUDANCAS-COMPLETAS.md`](PROMPT-MUDANCAS-COMPLETAS.md) | Tudo que foi implementado neste ciclo |
| [`APLICATIVO PORTAL CLIENTE/PUSH_SETUP.md`](../APLICATIVO%20PORTAL%20CLIENTE/PUSH_SETUP.md) | Firebase passo a passo |
| [`docs/MAPEAMENTO-MARCA-OFICINA-BETO.md`](MAPEAMENTO-MARCA-OFICINA-BETO.md) | Onde aparece o nome/logo no código |

---

*Última atualização: junho/2026 — instância dedicada (`SINGLE_TENANT=true`).*
