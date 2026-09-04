# Worklog

## 2026-09-04 - UX AR/AP: vencimento + histórico + popup dashboard

- Spec: `DEV/SPECS/ACTIVE.md`
- Changed: `financial.service.ts`, `financial.controller.ts`, `api.ts`, `OpenPayablesPanel.tsx`, `OpenPayablesModal.tsx`, `FinancialHistoryModal.tsx`, `FinancialPage.tsx`, `DEV/*`
- Why: cliente reclamou ordem aleatória (createdAt), CTA dashboard indo ao Financeiro, pagos misturados na fila
- Verify: lints OK; smoke UI pendente
- Next: smoke + commit/deploy

## 2026-09-04 - Fix AR/AP + vencimento automático

- Spec: `DEV/SPECS/ACTIVE.md`
- Changed: `financial.service.ts`, `FinancialPage.tsx`, `cron/*`, `vercel.json`, `DEV/*` (+ diff Contas removidas)
- Why: OVERDUE quebrava UI/fila; Maestro pediu status automático no vencimento; contas bancárias descontinuadas
- Verify: `npm run build -w @autocore/api` OK; smoke UI pendente
- Next: smoke + commit/redeploy

## 2026-07-28 - Liberar edição pós-aprovação

- Spec: `DEV/SPECS/ACTIVE.md`
- Changed: `service-orders.service.ts`, `quotes-sync.service.ts`, `ServiceOrderDetailPage.tsx`, `QuoteDetailPage.tsx`, `DEV/*`
- Why: oficina precisa corrigir nome/valores após orçamento aprovado sem recriar
- Verify: `npm run build -w @autocore/api` OK; smoke UI pendente
- Next: validar na OS aprovada editar peça e conferir totais
