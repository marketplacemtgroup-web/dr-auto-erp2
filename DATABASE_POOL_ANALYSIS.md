# DATABASE_POOL_ANALYSIS

Análise do pool de conexões — Wtec Motors — **26/06/2026**.

---

## Configuração atual (Prisma)

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // pooler :6543 ?pgbouncer=true
  directUrl = env("DIRECT_URL")        // direct :5432 (migrations)
}
```

- **Runtime API (Vercel):** `DATABASE_URL` → Supabase Transaction Pooler (PgBouncer, porta 6543).
- **Migrations:** `DIRECT_URL` → conexão direta 5432 (`prisma migrate deploy`).

Validação existente: `GET /api/env-check` verifica pooler 6543 + `pgbouncer=true`.

---

## Serverless (Vercel)

| Fator | Impacto |
|-------|---------|
| Cold starts | Cada instância abre conexões via pooler |
| Funções concorrentes | N instâncias × conexões lógicas |
| Queries longas | Mantém slot no pooler até completar |

**Recomendações:**

1. Manter **PgBouncer** em produção (já configurado).
2. Evitar transações longas; preferir queries curtas + cache (`CacheService`).
3. Configurar `connection_limit` baixo no Prisma se necessário (ex.: `?connection_limit=5` na URL pooler).
4. Usar Redis (`REDIS_URL`) para cache entre instâncias — reduz pressão no pool.

---

## Consultas de longa duração identificadas

| Serviço | Risco | Mitigação aplicada |
|---------|-------|-------------------|
| `ReportsService.dashboardFinancial` | Alto | `dashboard_cache` + cache Redis |
| `ReportsService.full` | Alto | Lazy load só na tela Relatórios |
| `FinancialService.cashFlow` | Médio | `/financial/summary` agregado |
| `PortalService.getDashboard` (legado) | Alto | Dividido em endpoints |

---

## Redis e conexões

Com `REDIS_URL` configurado, KPIs/dashboard/portal summary não reexecutam queries pesadas a cada request — **menos tempo de conexão ocupada**.

Fallback in-memory funciona por instância serverless (cache parcial).

---

## Ações recomendadas

1. Monitorar Supabase Dashboard → Database → Connections (picos).
2. Adicionar `?pgbouncer=true&connection_limit=5` se houver erros "too many connections".
3. Não usar `DIRECT_URL` no runtime da API.
4. Revisar cron jobs para batch + `organizationId` (implementado em maintenance reminders).

---

## Meta escalabilidade 500+ oficinas

- Pooler Supabase: **obrigatório**
- Cache distribuído Redis: **recomendado**
- Paginação: **obrigatória** (implementada)
- Índices compostos: ver [DATABASE_INDEX_REPORT.md](./DATABASE_INDEX_REPORT.md)
