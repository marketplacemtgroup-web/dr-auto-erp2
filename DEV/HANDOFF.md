# Handoff

Atualizado: 2026-09-04

## Estado

**Financeiro AR/AP corrigido (local, aguarda commit + redeploy API).**

- UI: `OVERDUE` pode baixar; parcelas não mostram "Pago" indevido
- `receiveQueue` + `createFromServiceOrder` anti-duplicata
- `syncOverdueStatuses` público: lista, open-summary, receive-queue + cron diário
- Contas bancárias: menu removido / redirect para lançamentos (decisão do Maestro)
- Delete pago/parcial bloqueado na UI (alinha API)

## Próximo

- Smoke manual dos 4 aceites em `DEV/SPECS/ACTIVE.md`
- Commit + redeploy API (cron `sync-overdue-financial` só sobe com deploy)
- Confirmar `CRON_SECRET` no Vercel da API

## Arquivos-chave

- `apps/api/src/financial/financial.service.ts`
- `apps/api/src/cron/cron.controller.ts` + `cron.module.ts`
- `apps/api/vercel.json` — cron `15 3 * * *`
- `app/src/pages/financial/FinancialPage.tsx`
- `app/src/App.tsx` + `FinancialLayout.tsx` (Contas fora)
