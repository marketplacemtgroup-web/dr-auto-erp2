# Fluxo: Compras, Estoque e Financeiro

## Visão geral

1. **Cadastrar fornecedor** em Fornecedores (`/dashboard/fornecedores`).
2. **Nova compra** em Compras — wizard com itens, frete e parcelas.
3. **Confirmar** gera contas a pagar no Financeiro (`origin: PURCHASE`) vinculadas ao fornecedor e à compra.
4. **Receber mercadoria** lança entrada no estoque (`StockMovement` tipo `IN`) e atualiza custo médio do produto.
5. **Pagar parcela** no Financeiro — suporta juros/multa e saída no caixa (`PAYMENT_OUT`).

## Status da compra

| Status | Significado |
|--------|-------------|
| `DRAFT` | Rascunho — sem financeiro nem estoque |
| `AWAITING_RECEIPT` | Confirmada — AP gerada, aguardando recebimento |
| `PARTIALLY_RECEIVED` | Recebimento parcial |
| `RECEIVED` | Totalmente recebida |
| `CANCELLED` | Cancelada — estorna AP abertas e estoque se já lançado |

## Rateio de frete

Frete + seguro + outras despesas são rateados proporcionalmente ao valor de cada item antes do recebimento (`finalUnitCost`).

## Lucro em OS

Ao usar peça na OS, o sistema grava `unitCost` (snapshot do custo médio/custo na hora) para relatórios de lucro real.

## Permissões

- `suppliers.manage` — fornecedores
- `purchases.manage` — compras (também aceita `inventory.manage` legado)
