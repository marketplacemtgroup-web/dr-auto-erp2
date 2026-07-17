# DATABASE_INDEX_REPORT

Índices PostgreSQL — Wtec Motors — **26/06/2026**.

Migration: `packages/database/prisma/migrations/20260626140000_performance_cache_indexes/migration.sql`

---

## Nova tabela

### `dashboard_cache`

- PK: `id`
- Unique: `(organization_id, date)`
- Index: `(organization_id, date)`

Campos: `revenue`, `expenses`, `profit`, `ticket_average`, `service_orders`, `closed_orders`, `updated_at`.

---

## Índices adicionados

| Tabela | Índice | Uso |
|--------|--------|-----|
| `service_orders` | `(organization_id, status)` | Listagens + KPIs por status |
| `service_orders` | `(organization_id, created_at)` | Relatórios por período |
| `service_orders` | `(organization_id, updated_at)` | Ordenação dashboard |
| `service_orders` | `(vehicle_id)` | Portal / histórico veículo |
| `quotes` | `(organization_id, status)` | Orçamentos pendentes |
| `quotes` | `(organization_id, created_at)` | Listagem ordenada |
| `customers` | `(organization_id)` | Listagem clientes |
| `vehicles` | `(organization_id, customer_id)` | Veículos por cliente |
| `financial_entries` | `(organization_id, status)` | Financeiro aberto/pago |
| `financial_entries` | `(organization_id, paid_at)` | Cash flow / receita |
| `products` | `(organization_id)` | Estoque |
| `attachments` | `(organization_id, service_order_id)` | Mídia OS |
| `maintenance_reminders` | `(organization_id, status)` | Cron preventiva |

Índices criados com `CREATE INDEX IF NOT EXISTS` (idempotente).

---

## Índices já existentes (schema Prisma)

- `organization_members(organization_id)`, `(user_id)`
- Unique constraints em FKs principais
- `daily_revenues(organization_id, date)`

---

## Consultas beneficiadas

1. `GET /service-orders?page=` — filter + order by `updated_at`
2. `GET /portal/quotes` — filter org + vehicle via join SO
3. `getOperationalKpis` — counts por status
4. `financial/summary` — aggregate por `paid_at`
5. `processDueNotifications` — filter org + status ACTIVE

---

## Verificação pós-deploy

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename;
```

---

## Próximos índices (se EXPLAIN ANALYZE indicar)

- `generated_commissions(organization_id, status, employee_id)`
- `financial_payment_splits(organization_id, payment_method)`
- Partial index: `service_orders` WHERE `deleted_at IS NULL`
