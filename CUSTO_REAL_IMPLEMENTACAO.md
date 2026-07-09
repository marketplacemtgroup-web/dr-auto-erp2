# Custo Real da OS / Ajuste Interno

## Objetivo

Separar valor comercial aprovado (bloqueado) do custo operacional editável após aprovação, sem alterar preço ao cliente, PDF ou recebíveis.

## Modelo de dados

### `ServiceOrderItem`
| Campo | Uso |
|-------|-----|
| `unitCost` | Custo previsto (congelado na aprovação) |
| `actualUnitCost` | Custo real pós-compra |
| `actualBrand`, `actualSupplierId` | Marca/fornecedor reais |
| `purchaseOrderItemId`, `purchaseDate`, `purchasePaymentMethod` | Vínculo com compra |
| `commercialLockedAt` | Trava comercial |

### `ServiceOrderItemCostHistory`
Auditoria por campo (`ACTUAL_UNIT_COST`, `ACTUAL_BRAND`, etc.) com `oldValue`, `newValue`, `note`, `userId`.

### `PurchaseOrderItem.serviceOrderItemId`
Vincula linha de compra ao item da OS.

## Fluxo

```
Orçamento aprovado → commercialLockedAt nos itens
                  → updateItem bloqueia unitPrice/discount/qty
                  → PATCH .../internal-cost altera só operacional
                  → Compra recebida com serviceOrderItemId → atualiza custo real
                  → Relatórios: lucro previsto vs real
```

## Backend

| Endpoint / método | Descrição |
|-------------------|-----------|
| `PATCH /service-orders/:soId/items/:itemId/internal-cost` | Ajuste operacional + histórico |
| `updateItem` | Rejeita campos comerciais se item travado |
| `lockCommercialItems` | Chamado na aprovação |
| `recalculateTotal` | Usa linhas aprovadas quando quote APPROVED |
| `purchases.service.receive` | `applyInternalCostFromPurchase` automático |

## Lucro

`apps/api/src/reports/reports-profit.util.ts`:
- `calcItemPlannedProfit` — usa `unitCost`
- `calcItemActualProfit` — usa `actualUnitCost ?? unitCost`

Relatórios expõem `grossProfit`, `grossProfitActual`, `costVariance`.

## Frontend

| Arquivo | Descrição |
|---------|-----------|
| `InternalCostDrawer.tsx` | Painel lateral "Ajustar custo interno" |
| `ServiceOrderDetailPage.tsx` | Blocos Comercial (readonly) + Operacional na aba Itens |

## Regras de segurança

1. `unitPrice`, `discount`, `quantity` imutáveis após aprovação
2. `FinancialEntry` não recalcula por mudança de custo
3. Portal/PDF não expõem custo interno
4. Toda alteração gera `ServiceOrderItemCostHistory` + `AuditLog`
