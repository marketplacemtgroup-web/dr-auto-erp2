# Relatório Final de Performance — Oficina Beto

**Data:** 25/06/2026  
**Objetivo:** Reduzir consumo Supabase (PostgreSQL + Storage), egress e preparar escalabilidade multi-oficina.

---

## Resumo executivo

Implementação completa do plano P0→P3. Nenhuma regra de negócio foi alterada — apenas forma de entrega, cache, paginação e carregamento sob demanda.

| Meta | Status |
|------|--------|
| Reduzir consumo DB ~70% | **Atingível** em cenários típicos (ver tabela abaixo) |
| Reduzir egress ~80% | **Atingível** (portal split + anexos + polling) |
| Eliminar listagens sem paginação | **Concluído** (9 módulos ERP + portal) |
| Dashboard ≤3 requisições | **Concluído** (`/summary`, `/alerts`, `/charts`) |
| Preparar 500+ oficinas | **Parcial** — base sólida; monitorar via PERFORMANCE_LOGGER |

---

## Alterações realizadas por área

### 1. Portal (maior ganho de egress)

**Antes:** 1× `GET /portal/dashboard` com quotes sync + N signed URLs + 20 OS + includes profundos.

**Depois:**
- `GET /portal/summary` (~5 queries leves)
- `GET /portal/orders`, `/quotes`, `/vehicles` sob demanda (paginados)
- `GET /portal/attachments/:id/url` — 1 URL por visualização

**Ganho estimado por sessão portal:** **60–75%** menos egress DB + **80–90%** menos Storage API calls no load inicial.

### 2. Polling ERP

**Antes:** 60s em todas as rotas → ~60 req/h/usuário.

**Depois:** 300s em dashboard/OS/orçamentos → ~12 req/h/usuário.

**Ganho:** **~80%** menos `GET /notifications/unread`.

### 3. Paginação listagens ERP

**Antes:** `findMany` sem limite — payload cresce linearmente com dados da oficina.

**Depois:** Default `limit=50`, resposta `{ data, pagination }`.

**Ganho:** **70–95%** por tela (depende do volume; oficina com 500 OS passa de 500 para 50 registros).

### 4. Dashboard financeiro + cache

**Antes:** 3× `dashboardFinancial()` por request de KPIs financeiros.

**Depois:** 1× `dashboardFinancial()` mês + cache diário (`dashboard_cache`, TTL 15 min) + invalidação em pagamentos.

**Ganho:** **~66%** menos report builds por KPI load; cache hit reduz a zero queries de report.

### 5. Financial summary (gráfico formas de pagamento)

**Antes:** `GET /financial/cash-flow` — 6 meses de lançamentos, agregação no browser.

**Depois:** `GET /financial/summary` — 3 aggregates + groupBy.

**Ganho:** **~90%** menos dados transferidos para o gráfico do dashboard.

### 6. Anexos e Storage

**Antes:** N× `createSignedUrl` em cada listagem; TTL 1h.

**Depois:** URL on-demand; cache 24h; lazy load no frontend.

**Ganho:** **~80%** menos chamadas Storage API em telas com muitas fotos.

### 7. Dashboard ERP consolidado

**Antes:** ~8–10 requests paralelos no dashboard.

**Depois:** 3 requests (`summary`, `alerts`, `charts`).

**Ganho:** **~65%** menos round-trips HTTP; menos conexões pooler.

### 8. N+1 e cron

- Lista funcionários: batch aggregates
- Comissões: preload + createMany
- Quote sync: batch writes
- Cron manutenção: por organização, lotes de 100

**Ganho:** Escalabilidade multi-tenant; evita full table scan global.

---

## Endpoints novos

| Método | Rota |
|--------|------|
| GET | `/portal/summary` |
| GET | `/portal/orders` |
| GET | `/portal/attachments` |
| GET | `/portal/attachments/:id/url` |
| GET | `/financial/summary` |
| GET | `/dashboard/summary` |
| GET | `/dashboard/alerts` |
| GET | `/dashboard/charts` |
| GET | `/attachments/:id/url` |
| GET | `/cron/dashboard-cache-refresh` |

## Endpoints deprecados

| Rota | Substituto |
|------|------------|
| `GET /portal/dashboard` | `/portal/summary` + endpoints split |

## Endpoints mantidos (aliases)

Rotas legadas `/dashboard/kpis`, `/dashboard/kpis/financial`, etc. delegam aos novos métodos.

---

## Observabilidade

Logs JSON via `PERFORMANCE_LOGGER`:
```json
{
  "type": "performance",
  "endpoint": "/api/customers",
  "method": "GET",
  "durationMs": 42,
  "recordCount": 50,
  "organizationId": "...",
  "statusCode": 200
}
```

Use para identificar endpoints lentos pós-deploy.

---

## Consultas reduzidas (estimativa composta)

| Cenário | Antes | Depois | Redução |
|---------|-------|--------|---------|
| Portal login + home | ~15–25 queries + N storage | ~8–12 queries | ~50–70% |
| ERP dashboard (financeiro) | ~25–40 queries | ~8–15 queries | ~60–70% |
| Lista OS (500 registros) | 1 query 500 rows | 1 query 50 rows | ~90% payload |
| Poll notificações (1h) | 60 requests | 12 requests | 80% |
| OS com 20 fotos | 20 signed URLs | 0–5 (lazy) | 75–100% |

---

## Próximos passos recomendados

1. **Aplicar migration** `dashboard_cache` em produção Supabase
2. **Configurar Vercel cron** para `/api/cron/dashboard-cache-refresh` a cada 15 min
3. **Monitorar** logs `PERFORMANCE_LOGGER` por 1 semana — baseline vs pós-deploy
4. **KPIs de abas** (OS ativas/histórico): endpoints `count` dedicados se KPIs cross-page forem necessários
5. **Relatórios BI:** implementar `GET /reports/:section` para reduzir payload do modo TV
6. **Web Push no ERP** — eliminar polling restante de notificações
7. **Thumbnails Storage** — Supabase Image Transform ou proxy resize para fotos OS

---

## Arquivos de referência

- Auditoria original: [`SUPABASE_USAGE_AUDIT.md`](SUPABASE_USAGE_AUDIT.md)
- Changelog técnico: [`PERFORMANCE_OPTIMIZATION_REPORT.md`](PERFORMANCE_OPTIMIZATION_REPORT.md)
- Visualização: [`analise egress/index.html`](analise%20egress/index.html)

---

*Implementação concluída em 25/06/2026. Builds: API (`nest build`) e ERP (`vite build`) OK.*
