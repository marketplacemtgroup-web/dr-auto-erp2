# Spec ativa — UX contas a pagar/receber + histórico

Status: **implemented** (smoke UI pendente)

## Objetivo

Ordenar filas abertas por vencimento, tirar pagos da lista principal para Histórico em popup, e fazer o CTA do dashboard abrir modal (não navegar ao Financeiro).

## Feito

1. API `GET /financial`: `orderBy` por `dueDate ASC` (aberto/misto) ou `paidAt DESC` (status=PAID); query `dueFrom`
2. Dashboard **Ver todas as despesas** → popup com PAYABLE em aberto, `dueDate >= hoje−3`, ordenado por vencimento
3. Financeiro default `open=1` (somente em aberto); botão **Histórico** com abas Já pago / Já recebido
4. Pagos não misturam na fila aberta; histórico read-only

## Aceite (smoke)

1. Dashboard → Contas a pagar → preview por vencimento
2. **Ver todas as despesas** abre popup (rota não muda); só ≥ hoje−3; dueDate ASC
3. Financeiro abre em aberto, ordenado por vencimento
4. Após pagar/receber, some da fila e aparece no Histórico
5. Histórico: mais recente (paidAt) no topo

## Fora de escopo

- Regras de baixa/pagamento, cron OVERDUE, CRUD contas bancárias
