# Peça Rápida / Produto Provisório

## Objetivo

Permitir montar orçamentos com peças estruturadas sem cadastro prévio no estoque. Após aprovação, o sistema cria produtos provisórios automaticamente.

## Modelo de dados

### `Product`
- `status`: `ACTIVE | PROVISIONAL`
- `needsReview`: boolean
- `sourceServiceOrderItemId`, `sourceQuoteId`: rastreio de origem

### `ServiceOrderItem`
- `isQuickPart`: peça criada inline no orçamento
- `quickPartCode`: código gerado (`PRV-000001`, ...)
- `partBrand`, `suggestedSupplierId`, `internalNotes`

## Fluxo

```
Orçamento → + Peça rápida (linha inline)
         → Cliente aprova
         → postQuoteApprovalHooks()
         → provisionQuickPartsOnApproval()
         → Product PROVISIONAL (stock=0, needsReview=true)
```

## Backend

| Arquivo | Responsabilidade |
|---------|------------------|
| `apps/api/src/products/products.service.ts` | `generateQuickPartCode`, `provisionQuickPartsOnApproval`, `listPendingReview` |
| `apps/api/src/service-orders/service-orders.service.ts` | `addItem` com `isQuickPart`, skip reserva para provisórios |
| `apps/api/src/quotes/quotes.service.ts` | Hook pós-aprovação via `postQuoteApprovalHooks` |
| `apps/api/src/portal/portal.service.ts` | Mesmo hook na aprovação pelo portal |

## Frontend

| Arquivo | Responsabilidade |
|---------|------------------|
| `app/src/components/quotes/QuickPartInlineRow.tsx` | Linha estilo planilha (sem modal) |
| `app/src/pages/quotes/QuoteDetailPage.tsx` | Botões: Buscar produto, Serviço/outro, Peça rápida |
| `app/src/pages/inventory/InventoryPage.tsx` | Aba "Pendentes de revisão" |

## API

- `POST /service-orders/:id/items` — aceita `isQuickPart`, `partBrand`, etc.
- `GET /products/pending-review` — produtos provisórios com OS/cliente de origem

## Regras de estoque

- Peça rápida sem `productId`: sem reserva/baixa
- Produto `PROVISIONAL` ou `stock=0 && needsReview`: ignora reserva e baixa física
- Na aprovação: cria cadastro com `stock=0`, sem movimentação

## Concluir cadastro

Em Estoque → Pendentes de revisão → editar produto → salvar com `status=ACTIVE`, `needsReview=false`.
