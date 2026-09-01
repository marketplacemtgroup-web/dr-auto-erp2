# Handoff

Atualizado: 2026-09-01

## Estado

**Financeiro — melhorias em lançamentos / a pagar (implementado):**
- Despesa nova nasce **em aberto** por padrão (não mais "já paga")
- "Já paga" na criação/edição passa pelo **razão** (`markPaid`)
- `GET /financial/open-summary` — totais reais + preview de despesas
- KPIs corrigidos (saldo restante, não só página atual)
- Parcelas: pai fecha ao quitar filhas; baixa bloqueada no pai
- Compra sincroniza `financialStatus` ao pagar/estornar
- Status `OVERDUE` automático por vencimento
- Filtros na tela: tipo, somente em aberto, badges de status
- Dashboard: card **A Pagar (Aberto)** + painel **Contas a pagar** no topo

**API prod 500:** fix local pronto — precisa commit + redeploy.

## Próximo

- Smoke: criar despesa em aberto → baixar → conferir saldo e dashboard
- Smoke: compra parcelada → pagar parcelas → status da compra
- Commit + redeploy API se ainda pendente

## Arquivos-chave

- `apps/api/src/financial/financial.service.ts` — open-summary, overdue, parcelas, compras
- `app/src/pages/financial/FinancialPage.tsx` — filtros e UX
- `app/src/components/OpenPayablesPanel.tsx` — painel no dashboard
- `app/src/pages/DashboardPage.tsx` — KPI e painel despesas
