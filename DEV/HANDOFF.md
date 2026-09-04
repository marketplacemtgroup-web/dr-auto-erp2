# Handoff

Atualizado: 2026-09-04 (UX AR/AP vencimento + histórico + popup dashboard)

## Estado

**Local (não commitado ainda):**

- API: `list()` ordena por vencimento (aberto) / `paidAt` (pago); filtro `dueFrom`
- App: popup despesas no dashboard; Financeiro default aberto; modal Histórico

**Em produção (push anterior `4530abb`):** cold start + IndexedDB + baixa financeira

## Próximo

- Smoke UI dos 5 critérios em `DEV/SPECS/ACTIVE.md`
- Commit + deploy API + app quando Maestro pedir
- CLI `vercel --prod` local ainda falha `spawn npm ENOENT` — preferir push GitHub

## Arquivos-chave

- `apps/api/src/financial/financial.service.ts` + `financial.controller.ts`
- `app/src/lib/api.ts` (`dueFrom` / `status` em `financialEntries`)
- `app/src/components/OpenPayablesPanel.tsx`
- `app/src/components/financial/OpenPayablesModal.tsx`
- `app/src/components/financial/FinancialHistoryModal.tsx`
- `app/src/pages/financial/FinancialPage.tsx`
