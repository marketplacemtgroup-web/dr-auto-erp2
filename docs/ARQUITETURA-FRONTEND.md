# Frontend — dois apps, dois links

| App | Pasta | Porta dev | Público | PWA |
|-----|-------|-----------|---------|-----|
| **Portal do cliente** | `apps/portal` | **3001** | Cliente final | Minha Oficina |
| **Dashboard ERP** | `app` | **3000** | Dono / equipe da oficina | OFICINA DO BETO ERP |

API única: `apps/api` na porta **4000**.

## URLs de produção (exemplo)

- Portal: `https://cliente.suaoficina.com` → container `portal` (:3001)
- Dashboard: `https://app.suaoficina.com` → container `dashboard` (:3000)
- API: `https://api.suaoficina.com` ou `/api` no mesmo domínio

## Variáveis

**Dashboard (`app/.env`):**
```env
VITE_PORTAL_URL=https://cliente.suaoficina.com
VITE_API_URL=
```

**Portal (`apps/portal/.env`):**
```env
VITE_DASHBOARD_URL=https://app.suaoficina.com
VITE_API_URL=
```

**API (`CORS_ORIGIN`):** liste as duas origens separadas por vírgula.

## Desenvolvimento

```powershell
npm run dev
```

- Portal: https://localhost:3001/login  
- ERP: http://localhost:3000/login  

## Links gerados pela oficina

- Link mágico cliente: `{VITE_PORTAL_URL}/acesso/{token}`
- Orçamento público: `{VITE_PORTAL_URL}/orcamento/{token}`

Copiados na OS do dashboard já usam `VITE_PORTAL_URL` automaticamente.
