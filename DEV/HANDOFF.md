# Handoff

Atualizado: 2026-07-28

## Estado

Liberação de edição comercial pós-aprovação **implementada**.

**API prod 500:** `Cannot find module '../dist/bootstrap.js'` — packaging Vercel. Fix local: `postbuild` copia `dist` → `api/nest-dist` + handler/`vercel.json` atualizados. **Precisa commit + redeploy da API.**

## Próximo

- Smoke manual: OS com orçamento APPROVED → Editar peça (nome + valor) → salvar → conferir totais e badge aprovado.
- Itens **novos** após aprovação ainda passam por sync com `approved: null` e podem reabrir o orçamento para PENDING (fluxo de suplemento).

## Arquivos-chave

- `apps/api/src/service-orders/service-orders.service.ts` — `updateItem` sem lock comercial
- `apps/api/src/quotes/quotes-sync.service.ts` — preserva `approved` em update
- `app/src/pages/service-orders/ServiceOrderDetailPage.tsx` — `canManageQuote` inclui APPROVED; botão Editar sempre
- `app/src/pages/quotes/QuoteDetailPage.tsx` — textos/gates alinhados (APPROVED ainda redireciona para OS)
