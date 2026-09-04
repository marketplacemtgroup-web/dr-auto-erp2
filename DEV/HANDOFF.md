# Handoff

Atualizado: 2026-09-04 (hotfix P2024 + race filtros financeiro)

## Estado

**Hotfix local (a commit/push):**

- Causa dos 500: Prisma `P2024` — pool `connection_limit=1` timeout 10s no cold start (RolesBootstrap + rajada de GETs)
- Fix API: `pool_timeout=30` em `db-env.ts`; RolesBootstrap atrasa 8s
- Fix App: FinancialPage carrega entradas primeiro com cancelamento de race; catches em todas as calls; Histórico mais visível

**Em produção:** `7e0f448` (UX AR/AP) — 500 intermitentes até este hotfix subir

## Próximo

- Push hotfix → esperar Ready API+app
- Smoke: cold open financeiro, alternar A pagar / A receber / Todos os tipos, Histórico

## Arquivos-chave

- `apps/api/api/db-env.ts`
- `apps/api/src/roles/roles-bootstrap.service.ts`
- `app/src/pages/financial/FinancialPage.tsx`
