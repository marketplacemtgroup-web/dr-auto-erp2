# Scalibur Oficinas — instância dedicada (dr-auto-erp2)

Este deploy é **um sistema por empresa**, não um SaaS com várias oficinas no mesmo banco.

- **Empresa:** Oficina Scalibur
- **Banco:** Supabase [`zejpaxphyaufrwdholyx`](https://zejpaxphyaufrwdholyx.supabase.co)
- **URLs:** API `dr-auto-erp2-api` · ERP `dr-auto-erp2-app` · Portal `dr-auto-erp2-portal` (Vercel)
- **NF-e:** desabilitado (sem emissão fiscal nesta versão)
- **WhatsApp / CRM:** desabilitados no menu

## Arquitetura

```
[Site + API]  ──►  [Supabase Postgres]
     │                    │
  um deploy           um projeto
  Scalibur            Scalibur
```

Não há cadastro de “nova oficina” depois da configuração inicial (`SINGLE_TENANT=true`).

## Variáveis importantes

| Variável | Valor sugerido |
|----------|----------------|
| `SINGLE_TENANT` | `true` |
| `DEFAULT_ORGANIZATION_NAME` | `Oficina Scalibur` |
| `VITE_APP_NAME` | `Oficina Scalibur` |
| `VITE_APP_TAGLINE` | `OFICINA MECÂNICA` |
| `SUPABASE_URL` | `https://zejpaxphyaufrwdholyx.supabase.co` |
| `VITE_API_URL` | `https://dr-auto-erp2-api.vercel.app` |
| `VITE_PORTAL_URL` | `https://dr-auto-erp2-portal.vercel.app` |
| `VITE_DASHBOARD_URL` | `https://dr-auto-erp2-app.vercel.app` |
| `VITE_SINGLE_TENANT` | `true` |

## Primeira subida (Supabase)

1. Crie o projeto Supabase **só para a Scalibur**
2. Copie `.env.supabase.example` → `.env` (e para `packages/database/.env`, `apps/api/.env`)
3. `npm run supabase:init` — schema + permissões
4. `npm run supabase:up` — API + web
5. Acesse `/cadastro` **uma vez** e crie o usuário administrador da Scalibur
6. Depois use só `/login` — o cadastro de nova empresa fica bloqueado

## Portal do cliente

Continua na raiz (`/`). Clientes entram com CPF + placa dos veículos **cadastrados na Scalibur**.

## Outra empresa no futuro

Duplique o deploy (novo Supabase + novo `.env` + outro domínio). Não compartilhe o mesmo banco entre empresas.
