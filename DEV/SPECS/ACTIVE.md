# Spec ativa — Correção AR/AP + vencimento automático

Status: **implemented** (smoke manual pendente; redeploy API necessário para cron)

## Objetivo

Corrigir inconsistências de contas a pagar/receber e garantir que status vire `OVERDUE` sozinho quando a data chega.

## Feito

1. Parcelas/lançamentos `OVERDUE` mostram botão de baixar (não mais "Pago")
2. Fila a receber inclui `OPEN`/`PARTIAL`/`OVERDUE` e sincroniza vencidos
3. OS já faturada (qualquer status ativo) não volta para "pronto para cobrar"
4. `createFromServiceOrder` reusa recebível `OPEN|PARTIAL|OVERDUE`
5. Contas bancárias fora do menu (confirmado pelo Maestro)
6. Cron diário `GET /cron/sync-overdue-financial` + sync em list/open-summary/receive-queue
7. Pai de parcela fica `OVERDUE` quando filhas vencem

## Aceite (smoke)

1. Parcela vencida → badge Vencido + botão Pagar/Receber
2. KPI "A receber" bate com fila (inclui vencidos)
3. OS com recebível vencido não aparece em "Cobrar"
4. Após meia-noite (ou abrir financeiro), OPEN com dueDate passado → OVERDUE

## Fora de escopo

- CRUD de contas bancárias (descontinuado no produto)
