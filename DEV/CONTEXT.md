# Context

## Projeto

Monorepo AutoCore ERP (API Nest + dashboard `app` + portal). Orçamento (`Quote`/`QuoteLine`) e OS (`ServiceOrder`/`ServiceOrderItem`) são árvores ligadas por `serviceOrderItemId`, não o mesmo registro.

## Comandos

- Dev: `npm run dev`
- Build API: `npm run build -w @autocore/api`
- Build full: `npm run build`

## Decisão recente

Edição administrativa pós-aprovação **sem** reaprovação do cliente: mudar nome/valores em item já aprovado não zera `approved` e não reabre o quote para PENDING. Incluir item **novo** na OS aprovada ainda cria linha pendente e pode reabrir suplemento.

## Risco ativo (financeiro)

UX de fila/histórico/popup dashboard implementada localmente. Smoke UI e deploy ainda pendentes. Cron OVERDUE depende de API em produção.
