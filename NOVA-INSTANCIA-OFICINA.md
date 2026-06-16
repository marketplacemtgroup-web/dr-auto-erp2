# Guia — Nova instância (nova oficina)

Este projeto é **uma oficina por deploy**: um banco Supabase, um conjunto de URLs na Vercel e uma marca (nome + logo).  
Não compartilhe o mesmo banco entre duas empresas.

Use este documento ao duplicar o sistema para outra oficina (ex.: sair da **Oficina do Beto** e criar **Oficina XYZ**).

---

## Visão geral

```
[Novo Supabase]  ←──  [3 arquivos .env iguais]  ←──  [API + ERP + Portal na Vercel]
       │
  migrations + cadastro inicial (/cadastro) — uma vez só
```

| Camada | O que criar do zero |
|--------|---------------------|
| **Supabase** | Projeto Postgres exclusivo |
| **Vercel** | 3 projetos: API, ERP, Portal |
| **Marca** | Nome, logo, favicon, textos |
| **Opcional** | Firebase (push Android), domínio próprio |

---

## Checklist rápido

- [ ] Criar projeto no [Supabase](https://supabase.com)
- [ ] Copiar `.env.supabase.example` → **3 arquivos** com o **mesmo** `[ref]` do projeto
- [ ] Ajustar nome da oficina nas variáveis `VITE_*` e `DEFAULT_ORGANIZATION_NAME`
- [ ] Substituir logos e favicons em `app/public` e `apps/portal/public`
- [ ] Ajustar `index.html`, `manifest.webmanifest` e `vite.config.ts` (ERP + Portal)
- [ ] Ajustar `app/src/lib/branding.ts` e `apps/portal/src/lib/branding.ts` (contato em impressões)
- [ ] `npm run db:deploy` + `npm run db:seed`
- [ ] Subir API, ERP e Portal (local ou Vercel)
- [ ] Acessar `/cadastro` **uma vez** e criar o administrador
- [ ] Configurar buckets no Supabase Storage (SQL)
- [ ] (Opcional) VAPID, Firebase, `CORS_ORIGIN`, domínios

---

## 1. Banco de dados (Supabase)

### 1.1 Criar projeto

1. Supabase → **New project** (nome sugerido: slug da oficina, ex. `oficina-xyz`).
2. Anote o **Project ID** (`[ref]`) — aparece na URL:  
   `https://supabase.com/dashboard/project/[ref]`

### 1.2 Variáveis de conexão

Em **Settings → Database → Connection string**:

| Uso | Porta | Variável |
|-----|-------|----------|
| API em produção / app | **6543** (pooler) + `?pgbouncer=true` | `DATABASE_URL` |
| Migrations no PC | **5432** (direct) | `DIRECT_URL` |

Em **Settings → API**: copie `SUPABASE_URL`, `anon key` e `service_role key`.

> **Senha com `@`, `#` ou `:`** → use URL encode na connection string (`@` → `%40`).

### 1.3 Os três `.env` devem ser iguais

O erro mais comum é cada pasta apontar para um Supabase diferente.

| Arquivo | Quem lê |
|---------|---------|
| `.env` (raiz) | Scripts gerais, referência |
| `packages/database/.env` | `npm run db:deploy`, Prisma |
| `apps/api/.env` | API NestJS local |

Copie o mesmo conteúdo de `.env.supabase.example` para os três e preencha com o **mesmo** `[ref]`.

```powershell
copy .env.supabase.example .env
copy .env.supabase.example packages\database\.env
copy .env.supabase.example apps\api\.env
```

### 1.4 Aplicar schema e permissões

```powershell
npm run db:deploy    # cria tabelas (não apaga outros projetos Supabase)
npm run db:seed      # permissões globais do sistema (sem oficina)
```

No Supabase → **Table Editor** → schema **`public`**: devem aparecer tabelas como `organizations`, `users`, `service_orders`, etc.

### 1.5 Storage (fotos de OS e veículos)

Supabase → **SQL Editor** → execute o script:

`scripts/supabase-storage-buckets.sql`

---

## 2. Nome e textos da oficina

### 2.1 Variáveis de ambiente (obrigatório)

Altere nos **três** `.env` da API/raiz/database e nos frontends:

| Variável | Onde | Exemplo |
|----------|------|---------|
| `DEFAULT_ORGANIZATION_NAME` | API | `OFICINA XYZ` |
| `SINGLE_TENANT` | API | `true` |
| `VITE_APP_NAME` | ERP + Portal | `OFICINA XYZ` |
| `VITE_APP_TAGLINE` | ERP | `OFICINA MECÂNICA` |
| `VITE_DEFAULT_ORGANIZATION_NAME` | ERP | `OFICINA XYZ` |
| `VITE_SINGLE_TENANT` | ERP | `true` |

**ERP** — crie/edite `app/.env`:

```env
VITE_APP_NAME="OFICINA XYZ"
VITE_APP_TAGLINE="OFICINA MECÂNICA"
VITE_DEFAULT_ORGANIZATION_NAME="OFICINA XYZ"
VITE_SINGLE_TENANT="true"
VITE_API_URL=
```

**Portal** — crie/edite `apps/portal/.env`:

```env
VITE_APP_NAME="OFICINA XYZ"
VITE_APP_TAGLINE="Portal do Cliente"
VITE_API_URL=
VITE_DASHBOARD_URL=http://localhost:3000
```

> `VITE_API_URL` vazio em dev = proxy do Vite (`localhost:3000/api` → API `4000`).

### 2.2 Arquivos de branding (código)

| Arquivo | O que mudar |
|---------|-------------|
| `app/src/lib/branding.ts` | `printContact` (endereço, e-mail, Instagram), fallbacks de nome |
| `apps/portal/src/lib/branding.ts` | Fallbacks de nome do portal |

Depois do **cadastro inicial**, nome, logo e cores também podem ser alterados em **Configurações** no ERP (salvos no banco).  
Favicon, PWA e título da aba do navegador vêm dos arquivos estáticos abaixo — exigem novo build.

### 2.3 Título da aba do navegador e PWA

| Arquivo | Campos |
|---------|--------|
| `app/index.html` | `<title>`, `apple-mobile-web-app-title`, `theme-color` |
| `apps/portal/index.html` | idem |
| `app/public/manifest.webmanifest` | `name`, `short_name`, `description` |
| `apps/portal/public/manifest.webmanifest` | idem |
| `app/vite.config.ts` | bloco `VitePWA` → `manifest.name`, `short_name`, `theme_color` |
| `apps/portal/vite.config.ts` | idem |

Cores padrão da marca: `#0F3D4C` (escuro) e `#0E7490` (destaque).

---

## 3. Logo e favicon

O sistema usa **um arquivo principal** servido em `/logo-oficinadobeto.png`.  
Para uma nova oficina, o caminho mais simples é **substituir as imagens mantendo o mesmo nome de arquivo**.

### 3.1 Arquivos para substituir (ERP)

Pasta `app/public/`:

- `logo-oficinadobeto.png` — logo principal (192×192 ou maior, PNG)
- `favicon.png` — ícone 32×32
- `favicon.ico` — ícone clássico

### 3.2 Arquivos para substituir (Portal)

Pasta `apps/portal/public/`:

- `logo-oficinadobeto.png`
- `favicon.png`
- `favicon.ico`
- `branding/logo.png` — cópia do mesmo logo (compatibilidade)

### 3.3 Se quiser outro nome de arquivo (ex. `logo-oficina-xyz.png`)

Substitua `logo-oficinadobeto` por `logo-oficina-xyz` em:

- `app/index.html`, `apps/portal/index.html`
- `app/public/manifest.webmanifest`, `apps/portal/public/manifest.webmanifest`
- `app/vite.config.ts`, `apps/portal/vite.config.ts`
- `app/src/lib/branding.ts` → `OFFICIAL_LOGO_URL`
- `apps/portal/src/lib/branding.ts` → `OFFICIAL_LOGO_URL`
- `app/vercel.json` e `apps/portal/vercel.json` (rewrite que exclui o logo)

No cadastro inicial (`/cadastro`) também é possível enviar o logo — ele fica no banco e no Storage.

---

## 4. API — segurança e integrações

No `apps/api/.env` (e na Vercel, projeto API):

| Variável | Ação |
|----------|------|
| `JWT_SECRET` | **Nova** string longa e aleatória (nunca reutilizar de outra oficina) |
| `CORS_ORIGIN` | URLs do ERP e Portal (sem `/` no final), ex.: `https://erp-oficina-xyz.vercel.app,https://portal-oficina-xyz.vercel.app` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Gerar novo: `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | `mailto:contato@oficina-xyz.com.br` |
| `FIREBASE_SERVICE_ACCOUNT` | Novo projeto Firebase se usar push no Android |

---

## 5. Primeiro acesso (cadastro único)

1. `npm run dev` (ou deploy na Vercel).
2. Abra o ERP: `http://localhost:3000/cadastro` (ou `https://SEU-ERP.vercel.app/cadastro`).
3. Preencha nome da oficina, CNPJ, admin e domínio de login (ex. `oficinaxyz.local`).
4. Após criar, `/cadastro` fica bloqueado (`SINGLE_TENANT=true`).
5. Use `/login` daqui em diante.

Se aparecer *"oficina já configurada"*:

- O banco já tem linha em `organizations` — use o login existente **ou**
- Zere só esse projeto Supabase (nunca zere um banco de outra oficina).

---

## 6. Deploy na Vercel (produção)

Crie **3 projetos** no mesmo repositório Git:

| Projeto Vercel | Pasta | Root Directory |
|----------------|-------|----------------|
| API | `apps/api` | `apps/api` |
| ERP | `app` | `app` |
| Portal | `apps/portal` | `apps/portal` |

Detalhes: [`docs/DEPLOY-VERCEL.md`](docs/DEPLOY-VERCEL.md)

### Variáveis mínimas na Vercel

**API:** `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SINGLE_TENANT`, `CORS_ORIGIN`, `NODE_ENV=production`

**ERP (build):** `VITE_API_URL=https://SUA-API.vercel.app`, `VITE_PORTAL_URL`, `VITE_APP_NAME`, `VITE_APP_TAGLINE`, `VITE_SINGLE_TENANT`

**Portal (build):** `VITE_API_URL`, `VITE_DASHBOARD_URL`, `VITE_APP_NAME`

Testes após deploy:

- `GET https://SUA-API.vercel.app/api/ping`
- `GET https://SUA-API.vercel.app/api/auth/setup-status`

---

## 7. Desenvolvimento local (sem Supabase)

Para testar só no PC, use Docker em vez do Supabase:

1. Copie `.env.example` → `.env`, `apps/api/.env`, `packages/database/.env`
2. `npm run db:up`
3. `npm run db:deploy` + `npm run db:seed`
4. `npm run dev`

---

## 8. O que **não** altera bancos antigos

| Ação | Efeito |
|------|--------|
| Editar `.env` no PC | Só muda para onde **seu computador** conecta |
| Criar novo projeto Supabase | Banco antigo intacto |
| `db:deploy` com URL do projeto novo | Só afeta esse projeto |
| Deploy na Vercel com env novo | Só afeta a nova instância |

Bancos de oficinas já finalizadas **não são alterados** ao configurar uma nova instância, desde que cada uma tenha seu próprio `[ref]` Supabase.

---

## 9. Resumo — arquivos por categoria

### Ambiente (novo Supabase + nomes)

- `.env`
- `packages/database/.env`
- `apps/api/.env`
- `app/.env`
- `apps/portal/.env`

### Marca visual (logo, aba, PWA)

- `app/public/logo-oficinadobeto.png` (+ favicons)
- `apps/portal/public/logo-oficinadobeto.png` (+ favicons + `branding/logo.png`)
- `app/index.html`, `apps/portal/index.html`
- `app/public/manifest.webmanifest`, `apps/portal/public/manifest.webmanifest`
- `app/vite.config.ts`, `apps/portal/vite.config.ts`
- `app/src/lib/branding.ts`, `apps/portal/src/lib/branding.ts`

### Documentação de referência

- [`docs/DEPLOY-VERCEL.md`](docs/DEPLOY-VERCEL.md) — deploy completo
- [`docs/SUPABASE-PRODUCAO.md`](docs/SUPABASE-PRODUCAO.md) — Supabase em produção
- [`.env.supabase.example`](.env.supabase.example) — modelo de variáveis
- [`.env.example`](.env.example) — modelo local (Docker)

---

## 10. Ordem sugerida (passo a passo)

1. Definir slug/nome da nova oficina (ex. `oficina-xyz`).
2. Criar Supabase exclusivo → copiar connection strings.
3. Preencher os **3** `.env` de banco com o **mesmo** `[ref]`.
4. Trocar logos e textos (seções 2 e 3).
5. `npm run db:deploy` → conferir tabelas no Table Editor (`public`).
6. `npm run db:seed`.
7. Executar SQL dos buckets de Storage.
8. `npm run dev` → `/cadastro` → criar admin.
9. Ajustar Configurações no ERP (logo, cores, termos).
10. Criar 3 projetos Vercel + variáveis + deploy.
11. Testar ERP, Portal e upload de foto em uma OS.

---

*Última atualização: junho/2026 — instância dedicada (`SINGLE_TENANT=true`).*
