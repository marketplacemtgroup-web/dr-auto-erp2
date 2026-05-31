# Deploy Scalibur — Vercel + Supabase

Hospedagem **100% na Vercel** (3 projetos) + **Supabase** (Postgres + fotos).

## Arquitetura

| Vercel (projeto) | Pasta | URL exemplo |
|------------------|-------|-------------|
| **scalibur-api** | `apps/api` | `https://scalibur-api.vercel.app` |
| **scalibur-erp** | `app` | `https://scalibur-erp.vercel.app` |
| **scalibur-portal** | `apps/portal` | `https://scalibur-portal.vercel.app` |

| Supabase | Uso |
|----------|-----|
| Postgres | Banco (Prisma) |
| Storage | Fotos OS / veículos (`os-media`, `vehicle-photos`, `documents`) |

---

## Passo 1 — Supabase

1. Crie o projeto em [supabase.com](https://supabase.com).
2. Copie `.env.supabase.example` → `.env` e preencha `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`.
3. Localmente:

```powershell
cd "e:\SITES\DR AUTO ERP"
npm run supabase:init
```

4. **Buckets de Storage** — no Supabase → **SQL Editor**, execute o conteúdo de [`scripts/supabase-storage-buckets.sql`](../scripts/supabase-storage-buckets.sql).

---

## Passo 2 — Deploy da API (primeiro)

1. [vercel.com](https://vercel.com) → **Add New Project** → importe o repositório GitHub.
2. **Root Directory:** `apps/api`
3. Framework: **Other** (usa [`apps/api/vercel.json`](../apps/api/vercel.json))
4. **Environment Variables:**

| Variável | Valor |
|----------|--------|
| `DATABASE_URL` | Pooler Supabase (porta **6543**, `?pgbouncer=true`) |
| `DIRECT_URL` | Direct Supabase (porta **5432**) — usado em migrations locais |
| `JWT_SECRET` | String longa e aleatória |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | `https://[ref].supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (Settings → API) |
| `SINGLE_TENANT` | `true` |
| `CORS_ORIGIN` | URLs dos frontends (atualize após passo 3) |

5. Deploy → anote a URL: `https://SEU-API.vercel.app`
6. Teste: `https://SEU-API.vercel.app/api/auth/setup-status`

---

## Passo 3 — Deploy ERP e Portal

### ERP (`app/`)

- **Root Directory:** `app`
- **Env (build):**

```
VITE_API_URL=https://SEU-API.vercel.app
VITE_PORTAL_URL=https://SEU-PORTAL.vercel.app
VITE_APP_NAME=Scalibur
VITE_APP_TAGLINE=Oficina
VITE_SINGLE_TENANT=true
```

### Portal (`apps/portal/`)

- **Root Directory:** `apps/portal`
- **Env (build):**

```
VITE_API_URL=https://SEU-API.vercel.app
VITE_DASHBOARD_URL=https://SEU-ERP.vercel.app
```

---

## Passo 4 — CORS na API

Volte ao projeto **API** na Vercel e atualize:

```
CORS_ORIGIN=https://SEU-ERP.vercel.app,https://SEU-PORTAL.vercel.app
```

Redeploy da API.

---

## Passo 5 — Primeiro acesso

1. Abra `https://SEU-ERP.vercel.app/cadastro` — crie a oficina (uma vez).
2. Login em `/login`.
3. Teste upload de foto na OS → deve ir para Supabase Storage.
4. Portal: `https://SEU-PORTAL.vercel.app/login` (CPF + placa).

---

## Checklist pós-deploy

- [ ] `GET /api/auth/setup-status` responde JSON
- [ ] Login ERP + dashboard KPIs
- [ ] Upload foto na OS (Supabase Storage)
- [ ] Portal: login e orçamentos
- [ ] Link mágico `/acesso/{token}` no portal
- [ ] Popup de orçamento aprovado (polling ~20s)
- [ ] PWA portal instalável (HTTPS Vercel)

---

## Alterações técnicas (já no código)

- **API serverless:** [`apps/api/api/index.ts`](../apps/api/api/index.ts) + [`bootstrap.ts`](../apps/api/src/bootstrap.ts)
- **Fotos:** Supabase Storage ([`supabase-storage.service.ts`](../apps/api/src/storage/supabase-storage.service.ts)) — dev local continua com pasta `uploads/`
- **Notificações:** polling no ERP (sem SSE) — [`useOfficeEvents.ts`](../app/src/hooks/useOfficeEvents.ts)

---

## Limitações

- **Cold start** da API: 1–3s após idle
- **Popup tempo real:** até ~20s de atraso (polling)
- **Plano Vercel Hobby:** timeout 10s por request — uploads até 10MB

---

## Domínio próprio (depois)

Em cada projeto Vercel → **Settings → Domains**:

- `app.suaoficina.com.br` → ERP
- `cliente.suaoficina.com.br` → Portal
- `api.suaoficina.com.br` → API

Atualize `VITE_*`, `CORS_ORIGIN` e redeploy.
