# PRISMA_OPTIMIZATION_REPORT

Auditoria Prisma — Wtec Motors — **26/06/2026**.

---

## Alterações já aplicadas

| Área | Antes | Depois |
|------|-------|--------|
| Listagens ERP | `findMany` sem limite | `count` + `findMany` com `skip/take` |
| Portal dashboard | `include` profundo + sync quotes | Summary sem includes pesados |
| Portal quotes | All rows | Paginated + sync throttled 10 min |
| Employees list | N+1 aggregate por funcionário | `groupBy` batch comissões + paginação |
| Attachments portal | Signed URL em loop | Metadados only; URL on-demand |
| Dashboard financial | 3× `dashboardFinancial` | Cache table + Redis |

---

## Includes profundos — revisar (P2 futuro)

### `service-orders.service.ts` — `soInclude`

Inclui: vehicle+customer, branch, 6 employees, items+product+catalog+5 executors, quotes+lines, statusHistory, checklistItems.

**Uso:** detalhe OS (necessário para tela completa).

**Recomendação:** manter no `findOne`; nunca usar em listagens (listagem usa include mínimo: vehicle+customer, branch).

### `quotes.service.ts` — `quoteInclude`

Inclui serviceOrder completo com items.

**Recomendação:** portal list poderia usar `select` reduzido (fase 2).

### `reports.service.ts`

- `buildOperations`, `calcProfit` — scans amplos por design (relatório).
- Mitigado: lazy load + cache dashboard.

---

## Select * implícito

Prisma não usa `SELECT *` literal, mas `include` amplo equivale a muitas colunas.

**Prioridade redução:**

1. `portal/listQuotes` — select lines + SO id/number only para list view
2. `search` global — limitar includes por tipo entidade
3. `employees.list` — `_count` já usado; avaliar remover `generatedCommissions` do include em list

---

## Joins excessivos

| Query | Joins | Status |
|-------|-------|--------|
| Portal getDashboard (legado) | 6+ | Substituído por summary |
| Dashboard getFinancialKpis | 3 reports + aggregates | Cache reduz frequência |
| SO findOne | 15+ relações | Aceitável (detalhe) |

---

## Batch / bulk

| Operação | Status |
|----------|--------|
| `createMany` checklist template | OK |
| Commission batch groupBy | Implementado |
| Maintenance cron batch | Implementado |
| Attachments purge batch 20 | Já existia |

---

## Recomendações próximas

1. Habilitar **Prisma query log** em staging: `log: ['query']` temporário.
2. Criar DTOs de resposta com `@nestjs/serializer` para limitar campos expostos.
3. Avaliar **Prisma `$queryRaw`** para KPIs agregados únicos (1 query vs 6 counts).
4. Documentar `soInclude` — proibir reuse em list endpoints.

---

## Impacto estimado pós-auditoria futura

- Detalhe OS: sem mudança (UX)
- Listagens: **−60% colunas transferidas** se selects específicos forem aplicados
- Relatórios BI: **−40% tempo** com materialized views ou `dashboard_cache` estendido
