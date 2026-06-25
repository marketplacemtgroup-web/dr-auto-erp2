# Auditoria de consumo Supabase — Oficina Beto

**Data:** 25/06/2026  
**Escopo:** monorepo completo (`app/`, `apps/portal/`, `apps/api/`, `APLICATIVO PORTAL CLIENTE/`, `supabase/`)  
**Método:** análise estática do código — nenhuma alteração foi feita.

---

## Resumo executivo

O projeto **não usa Supabase Realtime** no cliente nem no servidor. O consumo do Supabase concentra-se em:

| Camada | Uso do Supabase |
|--------|-----------------|
| **Banco (PostgreSQL)** | Prisma via `DATABASE_URL` — todas as leituras/escritas da API |
| **Storage** | `SupabaseStorageService` no backend (upload, signed URLs, buckets) |
| **Auth** | JWT próprio da API — **não** usa Supabase Auth no frontend |

Os maiores riscos de consumo excessivo são:

1. **Polling HTTP** no ERP (`useOfficeEvents`, 60s) em todas as rotas autenticadas  
2. **Portal dashboard** (`GET /portal/dashboard`) com `listQuotes` sem paginação + N signed URLs por anexo  
3. **Listagens ERP sem `take`** (OS, financeiro, orçamentos)  
4. **Dashboard financeiro** que dispara 3× `reportsService.dashboardFinancial` + `findMany` sem limite  
5. **N+1 em loops** (funcionários, comissões, sync de orçamentos)  
6. **Cron global** de manutenção preventiva sem filtro por organização  

**Estimativa de impacto relativo** (escala interna: Baixo / Médio / Alto / Crítico):

| Área | Impacto |
|------|---------|
| Realtime Supabase | Nenhum (não utilizado) |
| Polling ERP | **Alto** (contínuo, todos os usuários logados) |
| Portal web + Android | **Alto** (dashboard pesado, refresh frequente) |
| Listagens sem paginação | **Alto** (cresce com dados da oficina) |
| Storage signed URLs | **Médio** (N chamadas por listagem de anexos) |
| React Query | **Baixo** (bem configurado; sem `refetchInterval`) |

---

## Arquitetura relevante

```
Frontend (ERP / Portal / Android)
    → REST API (NestJS / Vercel)
        → Prisma → PostgreSQL (Supabase)
        → SupabaseStorageService → Supabase Storage (signed URLs, upload)
```

Nenhum frontend importa `@supabase/supabase-js`. O único cliente Supabase no código de produção está em `apps/api/src/storage/supabase-storage.service.ts` e `apps/api/api/env-check.ts`.

---

## 1. Uso de Realtime

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| *(nenhum)* | — | **Nenhum** | Nenhum egress de Realtime | Manter arquitetura atual (polling + Web Push). Se no futuro adotar Realtime, limitar a canais por organização e fazer `unsubscribe` no cleanup. |
| `apps/api/src/events/events.service.ts` | 14 | Informativo | Baixo | Comentário confirma decisão arquitetural: ERP usa polling em vez de SSE/Realtime. |
| `app/src/hooks/useOfficeEvents.ts` | 17 | Médio | **Alto** (substituto de Realtime) | Polling a cada 60s gera leituras contínuas no Postgres. Considerar Web Push para ERP ou polling apenas em rotas que precisam de alertas. |

---

## 2. Uso de `postgres_changes`

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| *(nenhum)* | — | **Nenhum** | Nenhum | Não há listeners `postgres_changes` em todo o repositório. |

---

## 3. Uso de `channels`

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| *(nenhum Supabase)* | — | **Nenhum** | Nenhum | Não há `supabase.channel()` no projeto. |
| `app/src/lib/pushSubscribe.ts` | 22 | Informativo | Nenhum (não é Supabase) | `pushManager.subscribe` é Web Push do browser, não canal Realtime. |
| `apps/portal/src/lib/pushSubscribe.ts` | 22 | Informativo | Nenhum | Idem — Web Push, não Supabase. |

---

## 4. Uso de `subscriptions`

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| *(nenhum Supabase Realtime)* | — | **Nenhum** | Nenhum | Sem subscriptions Supabase. |
| `apps/api/src/push/push.service.ts` | *(várias)* | Baixo | Baixo | Lê `pushSubscription` / `fcmToken` no banco por veículo ao enviar push — escopo limitado. |
| `apps/api/api/env-check.ts` | 90 | Baixo | Desprezível (health check) | `client.storage.listBuckets()` só na verificação de ambiente. |

---

## 5. Componentes sem `unsubscribe`

Como não há Realtime Supabase, esta seção cobre **listeners e timers** que poderiam vazar ou continuar após unmount.

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| `app/src/hooks/useOfficeEvents.ts` | 69–73 | **Baixo** (OK) | — | Faz cleanup correto: `clearInterval`, flag `cancelled`, remove `visibilitychange`. |
| `app/src/components/reports/ReportsTvMode.tsx` | 32–35 | **Baixo** (OK) | — | `clearInterval` e remove listener de teclado. |
| `apps/portal/src/components/portal/PortalPolling.tsx` | 20–22 | **Baixo** (OK) | — | Remove `visibilitychange` corretamente. |
| `app/src/pages/financial/FinancialPage.tsx` | 133–145 | **Médio** | Médio (UX + requisições órfãs) | `Promise.all` sem flag `cancelled` — `setState` pode rodar após unmount. Adicionar guarda de montagem ou `AbortController`. |
| `app/src/components/BrandingBootstrap.tsx` | 8–14 | Baixo | Baixo | `api.publicBranding()` sem abort — fetch pode completar após unmount. |
| `app/src/components/GlobalSearchDialog.tsx` | 29 | Baixo | Desprezível | `setTimeout` de focus sem cleanup — race em abrir/fechar rápido. |
| `apps/portal/src/pages/PortalServiceOrderPage.tsx` | 74–76 | Baixo | Baixo | `load()` async sem flag `cancelled`. |
| `apps/portal/src/pages/PortalNotificationsPage.tsx` | 19–22 | Baixo | Baixo | `setLoading` em `.finally()` sem guarda de montagem. |
| `app/src/hooks/useOrganizationBranding.ts` | 17–25 | Baixo | Baixo | CSS vars aplicadas sem reset no unmount — tema pode persistir entre sessões. |

---

## 6. Polling com `setInterval`

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| `app/src/hooks/useOfficeEvents.ts` | 15, 57–59 | **Alto** | **Alto** — ~1 req/min/usuário logado em **todas** as rotas ERP (`AppShell` → `OfficeNotificationPopup` L27) | Reduzir frequência, restringir a dashboard/notificações, ou migrar para Web Push no ERP. Endpoint: `GET /notifications/unread`. |
| `app/src/components/reports/ReportsTvMode.tsx` | 27 | Médio | Médio (só modo TV) | Refetch completo de relatórios a cada 60s. Aceitável para TV; documentar custo. |
| `apps/portal/src/components/portal/PortalPolling.tsx` | 15–16 | Médio | **Alto** (por sessão ativa) | Sem `setInterval`, mas `visibilitychange` → `refresh()` dispara `GET /portal/dashboard` completo a cada retorno à aba. Debounce (ex.: 30s) ou invalidar só se `stale`. |
| `APLICATIVO PORTAL CLIENTE/.../PortalViewModel.kt` | 99–103 | Baixo | Baixo | FCM via `PortalRefreshBus.requestRefresh()` — **sem** `setInterval` (push-driven). |
| `apps/api/src/portal/portal.service.ts` | 57–59 | Informativo (mitigação) | Positivo | Throttle de 10 min em `maybeSyncQuotesForVehicle` reduz sync pesado no poll do portal. |

**`setTimeout` apenas para UI** (sem impacto Supabase): `QuoteDetailPage.tsx`, `ProtectedRoute.tsx`, `PortalSplashPage.tsx`, etc.

---

## 7. React Query `refetchInterval`

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| *(nenhum)* | — | **Nenhum** | Nenhum | `refetchInterval` não é usado em nenhum `.ts`/`.tsx` do monorepo. |

---

## 8. React Query `refetchOnWindowFocus`

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| `app/src/main.tsx` | 17 | **Baixo** (OK) | Positivo | Globalmente `false` — evita rajadas ao focar aba. |
| `app/src/hooks/useDashboardKpis.ts` | 17, 31 | **Baixo** (OK) | Positivo | Reforça `false` nos KPIs. |
| `apps/portal/src/main.tsx` | 15 | **Baixo** (OK) | Positivo | Portal também desabilita refetch no focus. |
| *(default React Query)* | — | Baixo | Baixo | `refetchOnMount` padrão `true` quando stale; com `staleTime` 30 min (ERP) remount dentro de 30 min **não** refetch. |

**Nota:** O portal configura `QueryClientProvider` mas **não usa `useQuery`** — dados vêm do Zustand (`portalStore.ts`).

---

## 9. Chamadas repetidas para dashboard

### ERP — `app/src/pages/DashboardPage.tsx`

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| `app/src/hooks/useDashboardKpis.ts` | 11–18, 25–33 | Médio | Médio | 2 endpoints: `/dashboard/kpis` + `/dashboard/kpis/financial`. Unificar ou cache server-side. |
| `app/src/hooks/useDashboardLists.ts` | 4–13 | Médio | Médio | +3 endpoints: OS em progresso, orçamentos pendentes, série de receita. |
| `app/src/components/TodayAgenda.tsx` | 20–22 | Baixo | Baixo | `/appointments?from&to` (hoje). |
| `app/src/components/PreventiveMaintenancePanel.tsx` | 24 | Médio | Médio | `/maintenance-reminders?filter=overdue`. |
| `app/src/components/MaintenanceAlertModal.tsx` | 17–18 | Médio | Médio | `/maintenance-reminders/month-overdue` — overlap com painel acima. |
| `app/src/components/PaymentMethodsChart.tsx` | 18–20 | **Alto** | **Alto** | `/financial/cash-flow` — payload grande; agrega no browser só para gráfico de formas de pagamento. |
| `app/src/layouts/AppShell.tsx` | 9, 22 | Médio | Médio | `useOrganizationBranding` + `OfficeNotificationPopup` (poll) em **toda** rota, não só dashboard. |
| `app/src/components/AlertsPanel.tsx` | 46 | Médio | Baixo (dado errado) | Texto fixo `"3 orcamentos aguardando aprovacao"` — ignora KPI real; não gasta Supabase extra, mas UX enganosa. |

**Total estimado na 1ª visita ao dashboard (cache frio):** ~12 req. dashboard + ~3 do shell ≈ **15 requisições paralelas**.

### Backend — dashboard financeiro pesado

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| `apps/api/src/dashboard/dashboard.service.ts` | 115–119 | **Alto** | **Alto** | 3× `reportsService.dashboardFinancial()` (mês, hoje, ontem) — cada uma executa `buildFinancial` + `buildInventory` com múltiplos `findMany`. |
| `apps/api/src/dashboard/dashboard.service.ts` | 134–141 | Alto | Alto | `findMany` de todas OS entregues no mês sem `take`. |
| `apps/api/src/dashboard/dashboard.service.ts` | 198–207 | Médio | Médio | `findMany` de todos recebíveis pagos no mês para série diária. |
| `apps/api/src/reports/reports.service.ts` | 88–94, 165+ | Alto | Alto | `dashboardFinancial` delega a builders com ~20+ `findMany` sem limite por período. |

### Portal web

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| `apps/portal/src/stores/portalStore.ts` | 67–70, 77–80 | **Alto** | **Alto** | `login` → `refresh()` → `GET /portal/dashboard`. |
| `apps/portal/src/pages/PortalSplashPage.tsx` | 30–33 | Médio | Médio | `refresh()` no splash pode duplicar após login. |
| `apps/portal/src/pages/PortalHomePage.tsx` | 72–77 | Médio | Médio | `syncDashboard()` no mount — mitigado se dashboard persistido no Zustand. |
| `apps/portal/src/components/portal/PortalPolling.tsx` | 15–16 | Alto | Alto | Cada foco na aba = novo dashboard completo. |

### Android

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| `APLICATIVO PORTAL CLIENTE/.../PortalViewModel.kt` | 265–282 | Médio | Médio | `loadAllData()` sequencial: dashboard + vehicles. FCM pode disparar de novo. |
| `APLICATIVO PORTAL CLIENTE/.../PortalMessagingService.kt` | 50 | Baixo | Baixo | Push → `requestRefresh()` — event-driven, adequado. |

### Backend — portal dashboard

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| `apps/api/src/portal/portal.service.ts` | 385–498 | **Crítico** | **Crítico** | `getDashboard` orquestra quotes + OS + anexos + signed URLs. |
| `apps/api/src/portal/portal.service.ts` | 394 | Alto | Alto | `listQuotes()` a cada dashboard — sync + `findMany` sem `take`. |
| `apps/api/src/portal/portal.service.ts` | 440–447 | Médio | Médio | Anexos da última OS sem `take`. |
| `apps/api/src/portal/portal.service.ts` | 481 | Alto | Alto | `mapPortalAttachments` — N signed URLs Storage. |

---

## 10. Consultas sem paginação

### Backend — listagens ERP (alto volume)

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| `apps/api/src/service-orders/service-orders.service.ts` | 202–222 | **Alto** | **Alto** | `list()` — todas OS com `vehicle`, `customer`, `branch`. Adicionar `take`/`skip` ou cursor. |
| `apps/api/src/financial/financial.service.ts` | 51–68 | **Alto** | **Alto** | `list()` — todos lançamentos + parcelas. Paginar. |
| `apps/api/src/quotes/quotes.service.ts` | 201+ | **Alto** | **Alto** | `list()` — todos orçamentos com includes profundos. Paginar. |
| `apps/api/src/customers/customers.service.ts` | 78 | Médio | Médio | Lista clientes sem `take`. |
| `apps/api/src/vehicles/vehicles.service.ts` | 62, 113 | Médio | Médio | Lista veículos; detalhe com anexos sem limite. |
| `apps/api/src/products/products.service.ts` | 35 | Médio | Médio | Catálogo completo. |
| `apps/api/src/appointments/appointments.service.ts` | 93 | Médio | Médio | Agenda sem `take` (filtro de data ajuda). |
| `apps/api/src/purchases/purchases.service.ts` | 164 | Médio | Médio | Pedidos de compra. |
| `apps/api/src/attachments/attachments.service.ts` | 247–252 | Médio | Médio | Todos anexos de uma OS + N signed URLs. Limitar ou lazy-load. |

### Backend — portal e cron

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| `apps/api/src/portal/portal.service.ts` | 866–882 | **Crítico** | **Crítico** | Todos quotes não-DRAFT + lines + SO items. Paginar ou endpoint separado. |
| `apps/api/src/portal/portal.service.ts` | 1443–1450 | Médio | Médio | `listVehicles()` — todos veículos do cliente. |
| `apps/api/src/maintenance-reminders/maintenance-reminders.service.ts` | 188–194 | **Alto** | **Alto** (cron) | `ACTIVE` **sem** `organizationId` — todas as orgs do banco. Filtrar por org ou processar em lotes. |

### Backend — relatórios BI

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| `apps/api/src/reports/reports.service.ts` | 165, 173, 205, 219, 298, 461, 487, 503, 729, 857, 989, 1071, 1126, … | **Alto** | **Alto** (sob demanda) | Múltiplos `findMany` por período sem `take`. Aceitável para export pontual; pesado no modo TV (60s). |
| `apps/api/src/financial/financial.service.ts` | 728–744 | Médio | Médio | `cashFlow()` — 6 meses de splits + entries. Usado pelo gráfico do dashboard. |

### Consultas paginadas (boas práticas encontradas)

| Arquivo | Linha | Risco | Impacto |
|---------|-------|-------|---------|
| `apps/api/src/dashboard/dashboard.service.ts` | 232, 247 | OK | `take: 10` em listas do dashboard |
| `apps/api/src/notifications/notifications.service.ts` | 8–12 | OK | `take: limit` (default 20) |
| `apps/api/src/search/search.service.ts` | 19–103 | OK | `take: 8` por entidade |
| `apps/api/src/colaborador-app/colaborador-app.service.ts` | 312–320 | OK | `skip`/`take` |

---

## 11. Consultas executadas em loop

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| `apps/api/src/team/employees.service.ts` | 104–147 | **Alto** | **Alto** | Por funcionário: 3 queries (`aggregate`, `count`, `findFirst`). Batch ou view materializada. |
| `apps/api/src/team/commission-engine.service.ts` | 131–164+ | **Alto** | Alto (evento) | Por item OS × regra: `getActiveRules`, `findFirst`, `create`. Batch inserts. |
| `apps/api/src/quotes/quotes-sync.service.ts` | 102–131 | Médio | Médio | Por item: `update` ou `create` individual. Usar `createMany`/`updateMany` onde possível. |
| `apps/api/src/portal/portal.service.ts` | 97–116 | **Alto** | **Alto** | `Promise.all` com `createSignedUrl` por anexo — N chamadas Storage API. |
| `apps/api/src/attachments/attachments.service.ts` | 40–44 | **Alto** | **Alto** | `enrichMany` → signed URL por linha. |
| `apps/api/src/attachments/attachments-purge.service.ts` | 30–43 | Médio | Baixo (cron) | Loop ordem → anexos → `remove` individual. |
| `apps/api/src/maintenance-reminders/maintenance-reminders.service.ts` | 200–235 | Médio | Médio (cron) | Por reminder: `emitCustomer` + `update`. |
| `apps/api/src/service-orders/service-orders.service.ts` | 905–942 | Médio | Médio | Por peça na OS: verificação estoque + `findFirst` + `update`. |
| `apps/api/src/dashboard/dashboard.service.ts` | 159–161 | Baixo | Baixo | Loop em memória sobre OS já carregadas — OK. |

---

## 12. Downloads de Storage

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| `apps/api/src/storage/supabase-storage.service.ts` | 113–126 | Médio | Médio | `createSignedUrl` TTL **3600s** — gera URL; download ocorre no cliente direto do Supabase CDN. |
| `apps/api/src/storage/supabase-storage.service.ts` | 92–110 | Baixo | Baixo | `createSignedUploadUrl` — upload direto cliente→Storage (reduz tráfego API). |
| `apps/api/src/storage/supabase-storage.service.ts` | 51–77 | Baixo | Baixo | `upload` server-side para logos, docs, fotos. |
| `apps/api/src/attachments/attachments.service.ts` | 255–266 | Médio | Médio | `resolveDownloadUrl` — nova signed URL por request ao endpoint `/file`. |
| `apps/api/src/attachments/attachments.controller.ts` | 63 | Baixo | Baixo | Redirect para signed URL em cloud. |
| `apps/api/src/team/employee-documents.service.ts` | 81 | Baixo | Baixo | Signed URL por documento RH. |
| `apps/api/src/colaborador-app/colaborador-app.service.ts` | 61, 121, 623 | Médio | Médio | Signed URLs para foto e docs do colaborador. |
| `apps/api/src/organizations/organizations.service.ts` | 169–177 | Baixo | Baixo | Logo em bucket **público** `branding` — sem signed URL no download. |
| `app/src/lib/api.ts` | 1320–1324 | Baixo | Baixo | `PUT` direto na signed upload URL (egress de upload, não download). |

**Padrão:** o backend **não** faz proxy de bytes do Storage na nuvem — apenas gera URLs. Egress de download vai do Supabase → browser/app.

---

## 13. Uso de imagens

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| `app/src/lib/mediaUrl.ts` | 8–13 | Médio | Médio | Usa signed URL `http` direto; fallback `/api/attachments/:id/file` (re-assina). |
| `app/src/components/AttachmentGrid.tsx` | 33, 62–63 | Médio | Médio | `<img src={attachmentFileUrl(a)}>` — cada imagem = 1 download Storage/CDN. |
| `app/src/pages/settings/SettingsPage.tsx` | 206 | Baixo | Baixo | Logo org via `resolveAssetUrl`. |
| `app/src/lib/branding.ts` | 26–31 | Médio | Baixo | `resolveBrandingLogoUrl` — paths `/api/` sem base URL em deploy cross-origin. |
| `apps/portal/src/lib/mediaUrl.ts` | 3–6 | Médio | Médio | `resolveMediaUrl` — signed URLs Supabase pass-through. |
| `apps/portal/src/components/portal/PortalPhotosTab.tsx` | 52, 107–111 | Médio | Médio | Imagens lazy; sem refresh de URL após TTL 1h. |
| `APLICATIVO PORTAL CLIENTE/.../CommonComponents.kt` | 759 | Médio | Médio | Coil `AsyncImage` — download direto da signed URL. |
| `apps/api/src/storage/supabase-storage.service.ts` | 9, 113 | **Alto** | **Alto** (sessões longas) | TTL signed URL **1h** vs React Query cache **30min** — imagens podem quebrar sem refetch. Usar proxy `/api/attachments/:id/file` ou TTL alinhado. |

**Upload de imagens (consumo Storage):**

| Arquivo | Linha | Risco | Impacto |
|---------|-------|-------|---------|
| `app/src/pages/service-orders/ServiceOrderDetailPage.tsx` | 533 | Médio | Upload OS media |
| `app/src/pages/vehicles/VehicleDetailPage.tsx` | 80 | Baixo | Fotos veículo |
| `app/src/pages/settings/SettingsPage.tsx` | 189 | Baixo | Logo |
| `app/src/pages/team/EmployeeDetailPage.tsx` | 78–79 | Baixo | Docs RH |

---

## 14. Possíveis memory leaks

| Arquivo | Linha | Risco | Impacto estimado | Recomendação |
|---------|-------|-------|------------------|--------------|
| `app/src/hooks/useOfficeEvents.ts` | 22 | Baixo | Baixo | `seenRef` (`Set` de IDs) cresce indefinidamente na sessão. Limitar tamanho ou limpar periodicamente. |
| `apps/api/src/portal/portal.service.ts` | 58 | Baixo | Baixo (servidor) | `quoteSyncLastAt` Map cresce por par org:vehicle — sem eviction. Em serverless pode resetar; em instância longa, considerar LRU. |
| `apps/api/src/storage/supabase-storage.service.ts` | 16, 24–32 | Baixo | Baixo | Cliente Supabase singleton no Nest — OK para long-running; em serverless é por instância. |
| `app/src/main.tsx` | 18–19 | Baixo | Baixo (positivo) | `gcTime: 60min` — cache React Query liberado após 1h sem uso. |
| `apps/portal/src/stores/portalStore.ts` | 118–122 | Baixo | Baixo | Persiste `dashboard` no localStorage — não é leak de memória, mas dados stale. |
| `app/src/pages/financial/FinancialPage.tsx` | 133–145 | Médio | Médio | Async sem cleanup — ver §5. |
| `app/src/components/OfficeNotificationPopup.tsx` | 37–48 | Baixo (OK) | — | Cleanup de `overflow` e keydown. |

---

## Matriz de prioridades

| Prioridade | Item | Local principal |
|------------|------|-----------------|
| **P0** | Portal dashboard sem paginação + N signed URLs | `portal.service.ts` 385–498, 866–882 |
| **P0** | Polling ERP 60s em todo AppShell | `useOfficeEvents.ts` 15–59 |
| **P1** | Listagens ERP sem `take` (OS, financeiro, quotes) | `service-orders`, `financial`, `quotes` services |
| **P1** | Dashboard financeiro 3× reports + findMany mês | `dashboard.service.ts` 115–141 |
| **P1** | N+1 lista funcionários | `employees.service.ts` 104–147 |
| **P1** | Cron manutenção global | `maintenance-reminders.service.ts` 188–194 |
| **P2** | Cash-flow no dashboard para gráfico simples | `PaymentMethodsChart.tsx` 18–20 |
| **P2** | Signed URL TTL vs cache | `supabase-storage.service.ts` 9 vs `query-cache.ts` 2 |
| **P2** | Portal refresh duplicado (login/splash/polling) | `portalStore.ts`, `PortalPolling.tsx` |
| **P3** | Realtime Supabase | Não aplicável — não usado |

---

## Itens verificados sem risco relevante

- **Supabase Realtime / `postgres_changes` / `channels`:** ausentes em todo o repositório  
- **`refetchInterval`:** ausente  
- **`refetchOnWindowFocus`:** desabilitado globalmente (ERP e portal)  
- **Cliente Supabase no frontend:** ausente — arquitetura correta para segurança  
- **Supabase Auth no frontend:** não utilizado  
- **Polling Android:** removido em favor de FCM  

---

## Estimativa de volume (ordem de grandeza)

Valores ilustrativos para planejamento — dependem de usuários ativos e tamanho da base.

| Cenário | Requisições DB/Storage por hora (por usuário) |
|---------|-----------------------------------------------|
| ERP logado, aba visível, fora do dashboard | ~60 polls notificações + navegação ocasional |
| ERP no dashboard (cache quente) | ~0–2 (stale 30 min) |
| ERP no dashboard (cache frio) | ~15 queries API → dezenas de queries Prisma no backend |
| Portal web, usuário alternando abas 10×/h | ~10× `GET /portal/dashboard` (cada uma: 5–15+ queries Prisma + N Storage) |
| Modo TV relatórios | ~60× `/reports/full` por hora |

---

## Conclusão

O projeto está **bem posicionado** quanto a Realtime Supabase (não usa) e React Query (sem polling automático, focus desabilitado). Os maiores custos vêm de:

1. **Polling HTTP** como substituto de Realtime no ERP  
2. **Endpoints agregadores pesados** (portal dashboard, dashboard financeiro)  
3. **Listagens sem paginação** que escalam com o crescimento da oficina  
4. **Fan-out de signed URLs** em anexos  

Nenhuma alteração de código foi feita nesta auditoria. As recomendações acima são sugestões para uma fase posterior de otimização.

---

*Gerado por auditoria estática em 25/06/2026.*
