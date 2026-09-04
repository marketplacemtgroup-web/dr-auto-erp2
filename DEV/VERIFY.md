# Verify

## 2026-09-04 — Fix AR/AP + OVERDUE

| Check | Resultado |
|-------|-----------|
| `npm run build -w @autocore/api` | OK |
| Parcela OVERDUE → botão baixar | Código corrigido; smoke UI pendente |
| receiveQueue inclui OVERDUE/PARTIAL | Código corrigido |
| Anti-duplicata OS faturada | Código corrigido |
| Cron `sync-overdue-financial` | Registrado em `vercel.json` (15 3 * * *); ativo após redeploy |
| Contas bancárias fora do menu | Mantido (decisão Maestro) |

## 2026-07-28

| Check | Resultado |
|-------|-----------|
| `npm run build -w @autocore/api` | OK (nest build) — revalidado após fix sync→total |
| Smoke UI: editar item aprovado na OS | Pendente (manual) |
