# Atualização de Performance e Redução de Egress — WTEC Motors

**Data:** 26/06/2026  
**Escopo:** API NestJS, Portal PWA (cliente), ERP Web (oficina)  
**Objetivo:** Deixar o aplicativo mais rápido, escalável e com **menos consumo de egress Supabase/PostgreSQL**, sem alterar regras de negócio.

---

## Resumo executivo

Esta atualização ataca os maiores geradores de tráfego e carga no sistema:

1. **Portal do cliente** deixou de gerar dezenas de signed URLs do Supabase Storage no login.
2. **Listagens da API** passaram a ser paginadas — o frontend não baixa mais arrays gigantes.
3. **Dashboard do ERP** consolidou chamadas e passou a usar cache em camadas (Redis/in-memory + PostgreSQL).
4. **Polling e refetch** foram reduzidos para evitar requisições desnecessárias.
5. **Queries N+1 e bugs de paginação** foram corrigidos em funcionários, produtos e sincronização de orçamentos.
6. **Índices PostgreSQL** e tabela `dashboard_cache` aceleram relatórios e KPIs financeiros.

**Impacto estimado (ordem de grandeza):**

| Área | Melhoria estimada |
|------|-------------------|
| Login do portal (queries) | ~−70% |
| Egress de signed URLs no portal (carga inicial) | ~−80% |
| Requisições no dashboard ERP (abertura) | de ~8+ para **≤3** |
| Polling de notificações ERP | intervalo **5 min** (antes mais agressivo) |
| Listagem de funcionários (N+1) | **1 batch** em vez de N queries por linha |

---

## Problema que existia

Antes desta atualização, o sistema tinha padrões que escalavam mal:

- **Portal:** `/portal/dashboard` carregava OS, orçamentos e **todas as fotos com URL assinada** de uma vez. Cada URL = chamada ao Supabase Storage + bytes de egress.
- **API:** Vários endpoints devolviam **arrays completos** (clientes, OS, produtos, financeiro, etc.).
- **ERP:** Dashboard disparava múltiplas requisições paralelas; gráficos buscavam dados brutos; `refetchOnWindowFocus` refazia queries ao trocar de aba.
- **Relatórios financeiros:** KPIs do dia/mês recalculavam blocos pesados repetidamente.
- **Funcionários:** contagem de OS em andamento por funcionário era **N+1** (uma query por linha).
- **Produtos `lowStock`:** filtro quebrava paginação/total.
- **Cache Redis:** invalidação por prefixo usava `KEYS` (bloqueante em produção).

---

## O que foi implementado

### P0 — Portal do cliente (maior ganho de egress)

#### API (`apps/api/src/portal/`)

| Endpoint | Comportamento |
|----------|---------------|
| `GET /portal/summary` | Resumo leve: org, cliente, veículo, OS recente, agendamento, manutenção. Cache 5 min. |
| `GET /portal/orders` | OS paginadas (`page`, `take`, default 50). |
| `GET /portal/quotes` | Orçamentos paginados. |
| `GET /portal/attachments` | Metadados **sem** signed URL. |
| `GET /portal/attachments/:id/url` | URL assinada **sob demanda** (TTL 24h). |
| `GET /portal/dashboard` | **Legado** — mantido para Android antigo; payload reduzido; headers `Deprecation` + `Link` para `/portal/summary`. |

**Detalhes técnicos:**

- `buildPortalPhotoGalleryMeta()` monta galeria com `attachmentId` e `url: ''` — sem assinar no bulk.
- `mapQuoteListItem()` — listagem de orçamentos mais leve.
- `removeRejectedSupplementItems` em batch (menos round-trips).
- Invalidação de cache portal em approve/reject de orçamento (`invalidatePortalSummary`).

#### Portal PWA (`apps/portal/`)

- `portalStore.refresh()` → chama `summary` primeiro, depois `orders` + `quotes` em paralelo.
- Paginação com **load more** (`loadMoreOrders`, `loadMoreQuotes`).
- Persistência Zustand **só da sessão** (não persiste dashboard inteiro).
- Novos: `hooks/usePortalAttachmentUrl.ts`, `components/portal/PortalLazyAttachmentMedia.tsx`.
- `PortalPhotosTab`, `PortalChecklistSection` carregam mídia lazy via `portalAttachmentUrl`.
- `lib/api.ts` — tipos com `attachmentId`, client paginado.

**Android Portal Cliente (`APLICATIVO PORTAL CLIENTE/`):** **não foi alterado** nesta rodada. Continua usando `/portal/dashboard` (compatível, payload já menor).

---

### P0 — Paginação obrigatória na API

- DTO comum: `PaginationQueryDto` (`page`, `take`, max 200, default 50).
- Resposta padrão: `{ items, total, page, take, totalPages }`.
- Módulos paginados: clientes, veículos, OS, orçamentos, financeiro, produtos, compras, fornecedores, funcionários.
- ERP: `app/src/lib/pagination.ts` — `unwrapItems`, `paginatedQuery`; pickers usam `take=200` quando precisam de lista maior.

**App Oficina Android:** pode ter alterações locais de paginação (`PaginatedDto`, `.items`) — alinhar APK se ainda esperar array puro.

---

### P0 — Polling ERP (menos requisições)

- `useOfficeEvents.ts`: intervalo padrão **300_000 ms (5 min)**.
- `OfficeNotificationsProvider` centraliza polling só em rotas relevantes + usuário autenticado.
- Pausa quando aba oculta (`visibilitychange`).

---

### P1 — Dashboard financeiro e cache

#### Tabela `dashboard_cache` (migration `20260626140000_performance_cache_indexes`)

- Snapshot diário: `revenue`, `expenses`, `profit`, `ticket_average`, `service_orders`, `closed_orders`.
- TTL lógico 15 min via `DashboardCacheService` (refresh on stale).

#### Endpoints consolidados do dashboard ERP

| Endpoint | Conteúdo |
|----------|----------|
| `GET /dashboard/summary` | KPIs operacionais + financeiros (1 call) |
| `GET /dashboard/alerts` | Atrasos, clientes aguardando, estoque baixo |
| `GET /dashboard/charts` | OS em progresso, orçamentos pendentes, série receita, **`financialSummary`** |

- `getFinancialKpis` usa cache diário para lucro hoje/ontem (evita 3× `dashboardFinancial` completo).
- `PaymentMethodsChart` consome `financialSummary` do bundle `/dashboard/charts` (menos 1 request).
- Relatórios BI (`/reports/full`) **não** carregam automaticamente no dashboard.

#### Financeiro

- `GET /financial/summary` — receitas, despesas, lucro, formas de pagamento agregadas (6 meses).
- `FinancialPage` invalida `financial`, `financial/summary` e `dashboard` após mutações (não chave morta `cash-flow`).

---

### P1 — Cache por domínio e invalidação

**`DomainCacheService`:**

- `invalidateOperational()` — limpa dashboard + alerts.
- `invalidatePortalSummary()` — por org ou org+veículo.
- `invalidateFinancial()`, `invalidateInventory()`, `invalidateBranding()`, `invalidateSettings()`.

**Gatilhos:** mutações em OS, orçamentos, estoque disparam invalidação encadeada.

**`CacheService.delByPrefix`:** usa **Redis SCAN** (não `KEYS`) — seguro em produção.

**TTLs:**

| Domínio | TTL |
|---------|-----|
| Dashboard | 5 min |
| Financeiro | 15 min |
| Estoque | 5 min |
| Branding/Config | 24 h |
| Portal summary | 5 min |
| Signed URL (cache in-memory) | 24 h |

---

### P1/P2 — Correções de queries e storage

| Item | Correção |
|------|----------|
| **Funcionários** | `countOsInProgressByEmployees()` — batch com `groupBy` (fim do N+1 na listagem). |
| **Produtos `lowStock`** | Filtro via SQL raw com `COUNT` correto e paginação. |
| **Quotes sync** | Escritas em batch dentro de `$transaction`. |
| **Lembretes manutenção** | `count()` em vez de `findMany().length`. |
| **Supabase Storage** | Cache in-memory de signed URLs, cap **10.000** entradas, TTL **86400 s**. |
| **Anexos ERP** | `AttachmentGrid`: `loading="lazy"` + `decoding="async"`. |

---

### P1 — Frontend ERP (menos refetch)

- `main.tsx` / `useApiQuery`: `refetchOnWindowFocus: false` por padrão.
- `QuotesPage`: removido `refetchOnWindowFocus: true` explícito.
- `useDashboardKpis`, `useDashboardCharts`: cache React Query estável.

---

### Infraestrutura

| Componente | Local |
|------------|-------|
| Cache Redis + fallback in-memory | `apps/api/src/cache/cache.service.ts` |
| Performance logger | `apps/api/src/performance/` → `performance.log` |
| Compressão gzip | `apps/api/src/app-config.ts` |
| Índices PostgreSQL | migration `20260626140000_performance_cache_indexes` |

**Índices criados (exemplos):** `service_orders (org, status)`, `(org, updated_at)`, `financial_entries (org, paid_at)`, `attachments (org, service_order_id)`, etc.

---

## O que NÃO mudou (regras de negócio)

- Cálculo de faturamento, lucro peças/serviços e KPIs financeiros — **mesma lógica** (`buildFinancial`, `calcProfit`).
- Fluxos de OS, orçamentos, financeiro, comissões — comportamento funcional preservado.
- Endpoints legados mantidos (`/dashboard/kpis`, `/portal/dashboard`) para compatibilidade.

---

## Deploy

### 1. Migration (obrigatório uma vez)

```powershell
npm run db:deploy
```

Cria `dashboard_cache` + índices. Se retornar **"No pending migrations"**, a migration já está aplicada.

### 2. API

Deploy da API NestJS com as alterações em `apps/api/`.

**Opcional recomendado:** Redis configurado (`REDIS_URL`) para cache distribuído entre instâncias.

### 3. Frontends

| App | Ação |
|-----|------|
| **ERP Web** (`app/`) | Deploy normal (Vercel/host atual) |
| **Portal PWA** (`apps/portal/`) | Deploy normal |
| **Portal Android** | **Não obrigatório** — API legado compatível |
| **App Oficina Android** | Rebuild APK **só se** versão instalada ainda espera array em listagens paginadas |

### 4. Verificação pós-deploy

- [ ] Portal: login → home carrega rápido; fotos aparecem ao abrir aba (lazy).
- [ ] ERP dashboard: Network tab → ≤3 requests iniciais (`summary`, `alerts`, `charts`).
- [ ] Listagens ERP: paginação funciona (produtos, clientes, OS).
- [ ] Financeiro: KPIs atualizam após baixar recebível.
- [ ] Funcionários: lista carrega sem lentidão proporcional ao número de linhas.

---

## Compatibilidade e breaking changes

| Consumidor | Impacto |
|------------|---------|
| ERP Web atualizado | OK — adaptado a `{ items, total, ... }` |
| Portal PWA atualizado | OK — lazy attachments + paginação |
| Portal Android legado | OK — `/portal/dashboard` mantido |
| App Oficina Android antigo | Pode quebrar se esperar array direto — atualizar APK ou API wrapper |
| Integrações externas | Se consomem listagens, passar `page`/`take` e ler `.items` |

---

## Arquivos principais alterados

```
apps/api/src/portal/portal.service.ts
apps/api/src/portal/portal.controller.ts
apps/api/src/cache/domain-cache.service.ts
apps/api/src/cache/cache.service.ts
apps/api/src/dashboard/dashboard.service.ts
apps/api/src/dashboard/dashboard-cache.service.ts
apps/api/src/financial/financial.service.ts
apps/api/src/team/employees.service.ts
apps/api/src/products/products.service.ts
apps/api/src/quotes/quotes-sync.service.ts
apps/api/src/storage/supabase-storage.service.ts
apps/portal/src/stores/portalStore.ts
apps/portal/src/hooks/usePortalAttachmentUrl.ts
apps/portal/src/components/portal/PortalLazyAttachmentMedia.tsx
apps/portal/src/components/portal/PortalPhotosTab.tsx
app/src/hooks/useDashboardLists.ts
app/src/components/PaymentMethodsChart.tsx
app/src/pages/financial/FinancialPage.tsx
packages/database/prisma/migrations/20260626140000_performance_cache_indexes/
```

---

## Prompt de referência (copiar/colar)

Use o bloco abaixo para explicar a atualização a outro agente, equipe ou changelog:

---

**Prompt:**

> Implementamos uma atualização de performance e redução de egress no WTEC Motors (26/06/2026) cobrindo API NestJS, Portal PWA e ERP Web.
>
> **Portal (P0):** Anexos deixaram de vir com signed URL em bulk. A API expõe metadados + `GET /portal/attachments/:id/url` sob demanda. Login usa `/portal/summary` + `/portal/orders` + `/portal/quotes` paginados. Galeria usa `attachmentId` e lazy load no PWA. `/portal/dashboard` permanece legado para Android.
>
> **API (P0):** Paginação padrão `{ items, total, page, take, totalPages }` em listagens principais. Polling ERP reduzido para 5 min. Cache por domínio com invalidação (`invalidateOperational`, `invalidatePortalSummary`, `invalidateFinancial`, `invalidateInventory`). Redis `delByPrefix` via SCAN.
>
> **Dashboard ERP (P1):** Três endpoints consolidados (`/dashboard/summary`, `/alerts`, `/charts`). Cache diário em `dashboard_cache`. `financialSummary` embutido em charts. Menos refetch no React Query.
>
> **Correções (P1/P2):** N+1 em funcionários (batch OS count), bug `lowStock` paginação, quotes sync em transaction, maintenance reminders com `count()`, signed URL cache LRU 10k TTL 24h, gzip, índices PostgreSQL.
>
> **Deploy:** `npm run db:deploy` + deploy API + ERP web + Portal PWA. Android Portal Cliente não precisa rebuild. App Oficina só se APK antigo não suportar paginação.
>
> **Não alteramos regras de negócio** (faturamento, lucros, fluxos operacionais). Endpoints legados mantidos.

---

## Próximos passos opcionais (fora desta entrega)

- Migrar **Portal Android** para endpoints novos + lazy attachments.
- Materializar `calcProfit` para relatórios muito pesados.
- Paginação em agendamentos.
- Unificar `amount` vs `amountReceived` no faturamento diário/gráfico (inconsistência menor identificada na auditoria financeira).

---

*Documento gerado a partir da implementação de performance/egress — WTEC Motors, jun/2026.*
