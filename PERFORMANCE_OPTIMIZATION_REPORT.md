# Relatório de Otimização de Performance — Changelog Técnico

**Projeto:** Oficina Beto / AutoCore  
**Período:** 25/06/2026

---

## Fase 0 — Infraestrutura

| Arquivo | Alteração |
|---------|-----------|
| `apps/api/src/common/pagination.ts` | `parseListQuery`, `paginatedResponse`, default limit 50 |
| `apps/api/src/common/performance-logger.ts` | `PERFORMANCE_LOGGER` JSON estruturado |
| `apps/api/src/common/performance.interceptor.ts` | Interceptor global (endpoint, durationMs, recordCount) |
| `apps/api/src/common/perf-context.ts` | AsyncLocalStorage para contexto de request |
| `apps/api/src/app-config.ts` | Registro do interceptor global |

---

## P0 — Portal dashboard split

| Endpoint | Descrição |
|----------|-----------|
| `GET /portal/summary` | Org, cliente, veículo, appointment, manutenção |
| `GET /portal/orders` | OS paginadas |
| `GET /portal/quotes` | Orçamentos paginados (já existia, agora paginado) |
| `GET /portal/vehicles` | Veículos paginados |
| `GET /portal/attachments` | Metadados sem URL |
| `GET /portal/attachments/:id/url` | Signed URL sob demanda |
| `GET /portal/dashboard` | **Deprecated** — retorna summary + arrays vazios |

**Frontend:** `portalStore.ts`, `apps/portal/src/lib/api.ts`, Android `PortalApi.kt` / `PortalViewModel.kt`, debounce 60s em `PortalPolling.tsx`.

---

## P0 — Paginação obrigatória (9 módulos)

Todos retornam `{ data, pagination }`:
- service-orders, customers, vehicles, financial, products, purchases, suppliers, employees, quotes

**ERP web:** `app/src/lib/pagination.ts`, `ListPagination.tsx`, 9 list pages, pickers com search+limit.

---

## P0 — Polling ERP

| Arquivo | Alteração |
|---------|-----------|
| `app/src/contexts/NotificationPollingContext.tsx` | Provider centralizado, intervalo **5 min** |
| `app/src/layouts/WithNotificationPolling.tsx` | Wrapper para rotas específicas |
| `app/src/App.tsx` | Dashboard, OS, Orçamentos apenas |
| `app/src/layouts/AppShell.tsx` | Removido popup global |
| Removido `useOfficeEvents.ts` | Substituído pelo context |

---

## P1 — Dashboard cache

| Arquivo | Alteração |
|---------|-----------|
| `packages/database/prisma/schema.prisma` | Model `DashboardCache` |
| `supabase/migrations/20260625120000_dashboard_cache.sql` | Migration SQL |
| `apps/api/src/dashboard/dashboard-cache.service.ts` | Cache TTL 15 min, invalidação |
| `apps/api/src/dashboard/dashboard.service.ts` | `getFinancialKpis` usa cache (elimina 2× dashboardFinancial) |
| `apps/api/src/financial/financial.service.ts` | Invalidação em `markPaid` |
| `apps/api/src/cron/cron.controller.ts` | `GET /cron/dashboard-cache-refresh` |

---

## P1 — Financial summary

| Arquivo | Alteração |
|---------|-----------|
| `GET /financial/summary` | Receitas, despesas, lucro, paymentMethods agregados |
| `app/src/components/PaymentMethodsChart.tsx` | Usa summary em vez de cash-flow completo |

---

## P1 — Relatórios lazy

| Arquivo | Alteração |
|---------|-----------|
| `app/src/pages/reports/ReportsPage.tsx` | `React.lazy` para Dashboard, Print, TV mode |

---

## P2 — Storage e anexos

| Arquivo | Alteração |
|---------|-----------|
| `supabase-storage.service.ts` | TTL 24h, cache in-memory 23h |
| `attachments.service.ts` | Listagem sem URL; `getSignedUrlForClient` |
| `GET /attachments/:id/url` | URL sob demanda |
| `AttachmentGrid.tsx` | IntersectionObserver + lazy |
| `PortalPhotosTab.tsx` | Lazy media |

---

## P3 — Dashboard ERP consolidado

| Endpoint | Conteúdo |
|----------|----------|
| `GET /dashboard/summary` | KPIs operacionais + financeiros |
| `GET /dashboard/alerts` | Alertas consolidados |
| `GET /dashboard/charts` | Gráficos e listas |

**Frontend:** `useDashboardBundle`, `DashboardBundleProvider`, `AlertsPanel` corrigido.

---

## P3 — Batch N+1 e cron

| Arquivo | Alteração |
|---------|-----------|
| `employees.service.ts` | Aggregates em batch |
| `commission-engine.service.ts` | Preload rules + createMany |
| `quotes-sync.service.ts` | createMany / batch updates |
| `maintenance-reminders.service.ts` | Processamento por org, lotes de 100 |

---

## Breaking changes controlados

1. Listagens API: `{ data, pagination }` — ERP web atualizado
2. Portal quotes/vehicles: paginado — web/Android atualizados
3. `GET /portal/dashboard`: arrays vazios — clientes migrados para split
4. Anexos em listagem: sem `url` — fetch via `/attachments/:id/url`

## Deploy

1. Aplicar migration: `supabase/migrations/20260625120000_dashboard_cache.sql`
2. `npx prisma generate` em `packages/database`
3. Configurar cron: `GET /api/cron/dashboard-cache-refresh` (15 min)
