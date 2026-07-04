# ERP Financeiro Profissional — DR AUTO ERP

Documentação da implementação do módulo financeiro profissional, faseada, com razão (ledger) como fonte da verdade dos saldos.

## Princípios inegociáveis

- **Migrations aditivas**: colunas novas anuláveis + backfill. Sem `DROP`/`NOT NULL` em dados existentes.
- **Estorno, não delete**: lançamentos pagos/parciais são estornados (`REVERSED`), nunca apagados.
- **Razão único**: toda movimentação de dinheiro passa por `FinancialAccountMovement` via `LedgerService.post()`.
- **Isolamento**: OS, Dashboard operacional, Portal e Apps não foram alterados na lógica de negócio — apenas integram-se gerando lançamentos financeiros (como já existia).

## Arquitetura central

```
FinancialAccount (onde está o dinheiro)
        ↑
FinancialAccountMovement (razão — fonte da verdade)
        ↑
FinancialEntry (a pagar/receber) ── baixa ──→ Ledger
Transfer / Aporte / Retirada ────────────────→ Ledger (par de movimentos)
Loan ────────────────────────────────────────→ Ledger + parcelas → Entry
CashRegisterSession ── accountId ──→ Caixa Principal (conta unificada)
```

### Regra de ouro: saldo vs faturamento

| Operação | Altera saldo (razão) | Altera faturamento/DRE |
|----------|---------------------|------------------------|
| Baixa recebível | Sim (CREDIT) | Sim (receita) |
| Baixa pagável | Sim (DEBIT) | Sim (despesa) |
| Transferência | Sim (DEBIT origem + CREDIT destino) | **Não** |
| Aporte sócio | Sim (CREDIT destino) | **Não** |
| Retirada sócio | Sim (DEBIT origem) | **Não** |
| Empréstimo recebido | Sim (LOAN_IN) | **Não** |
| Estorno | Movimento inverso | Reverte classificação |

## Modelo de dados (novos / estendidos)

### FinancialAccount
Contas financeiras: Caixa, Banco, Carteira Digital, Maquininha, Cofre, Conta PF Sócio.

Campos principais: `name`, `type`, `openingBalance`, `currentBalance`, `isPrimary`, `status`, `allowsMovement`.

Por organização existe **Caixa Principal** (`isPrimary=true`), criada no backfill da migration.

### FinancialAccountMovement (razão)
Registro imutável de crédito/débito. Campos: `direction`, `amount`, `balanceAfter`, `movementKind`, `movementDate`, links opcionais (`financialEntryId`, `transferId`, etc.).

`movementKind`: `RECEIVABLE`, `PAYABLE`, `TRANSFER_IN`, `TRANSFER_OUT`, `CONTRIBUTION`, `WITHDRAWAL`, `LOAN_IN`, `LOAN_PAYMENT`, `ADJUSTMENT`, `FEE`, `SUPPLY`, `WITHDRAWAL_CASH`.

### CostCenter
Centros de custo padrão por org: Oficina, Administração, Estoque, Recepção, Marketing, Financeiro, Outros.

### FinancialEntry (campos novos)
- `accountId`, `costCenterId`
- `documentType`, `documentNumber`
- `amountPaid` (baixa parcial acumulada)
- Status: `PARTIAL`, `OVERDUE`, `REVERSED`
- Origins: `TRANSFER`, `CONTRIBUTION`, `WITHDRAWAL`, `LOAN`

### Patrimônio (Fase 2)
- `FinancialTransfer` — transferência entre contas
- `CapitalContribution` — aporte de sócio
- `PartnerWithdrawal` — retirada (PRO_LABORE, LUCROS, etc.)

### Empréstimos (Fase 3)
- `Loan` + `LoanInstallment` — recebimento credita conta; parcelas geram contas a pagar

### Conciliação (Fase 4)
- `BankReconciliation` + `reconciliationStatus` no movimento (preparado para OFX via `externalRef`)

## Backend (NestJS)

### LedgerService (`apps/api/src/ledger/`)
- `post(tx, input)` — única porta de escrita no razão + atualização atômica de `currentBalance`
- `recomputeBalance()` / `recomputeAllBalances()` — auditoria e correção

### AccountsModule (`apps/api/src/accounts/`)
- CRUD de contas
- Extrato e saldo (lê o razão)
- `ensurePrimaryAccount()` / `ensureDefaultCostCenters()`

### FinancialService (alterações)
- `markPaid`: exige conta, posta no razão, suporta **baixa parcial** (`amountToPay`, status `PARTIAL`)
- `reverse`: estorno com movimentos inversos, status `REVERSED`
- `remove`: bloqueia delete de `PAID`/`PARTIAL`

### CashService (caixa unificado)
- Sessão aponta para conta principal
- SUPPLY/WITHDRAWAL espelham no razão

### EquityModule (`apps/api/src/equity/`)
- `/financial/transfers`, `/financial/contributions`, `/financial/withdrawals`

### LoansModule (`apps/api/src/loans/`)
- Cria empréstimo, credita conta (`LOAN_IN`), gera parcelas como contas a pagar

### CashFlowModule (`apps/api/src/cashflow/`)
- Relatório de fluxo de caixa agrupável (dia/semana/mês/ano)
- Conciliação bancária

### Reports (lucro operacional)
- `isNonOperationalPayable` usa `origin`/`movementKind` estruturado + fallback por texto para dados legados
- `buildFinancial` inclui `accountBalances`

## Frontend (React)

### Navegação
`FinancialLayout` com sub-abas:
- Lançamentos (`/dashboard/financeiro/lancamentos`)
- Contas (`/dashboard/financeiro/contas`)
- Fluxo de Caixa (`/dashboard/financeiro/fluxo-caixa`)
- Transferências (`/dashboard/financeiro/transferencias`)
- Empréstimos (`/dashboard/financeiro/emprestimos`)
- Conciliação (`/dashboard/financeiro/conciliacao`)

### PayEntryModal
- Seleção de **conta financeira**
- **Baixa parcial** (`amountToPay`, exibe `amountPaid` acumulado)
- Splits com `accountId` por forma de pagamento

### Lançamentos
- Botão **Estornar** para `PAID`/`PARTIAL`
- KPI **Saldo contas** (soma das contas ativas)

## Estoque (Fase 3)

- `Product`: campos opcionais (`barcode`, `subcategory`, `cest`, `unit`, `weight`, `maxStock`, `markup`, etc.)
- `StockMovementType`: `LOSS`, `TRANSFER`, `INVENTORY`, `DEVOLUTION`
- **`reservedStock`**: reservado ao adicionar peça na OS em fase de orçamento; liberado ao cancelar/remover; convertido em baixa física na execução
- Compras: `ipi`/`icms` por item (custo médio ponderado inalterado)

## Migration e backfill

Migration: `packages/database/prisma/migrations/20260703200000_erp_financeiro_profissional/`

1. Cria tabelas e enums
2. Cria **Caixa Principal** por organização
3. Cria centros de custo padrão
4. Vincula sessões de caixa e lançamentos pagos à conta principal
5. Sincroniza `amount_paid` com valores já recebidos

**Backfill do razão** (histórico): após aplicar a migration, executar:

```bash
node packages/database/scripts/backfill-ledger.mjs
```

Script idempotente — cria movimentos para lançamentos pagos e movimentos de caixa ainda sem registro no razão, depois recalcula `currentBalance`.

## Fluxo de baixa parcial

1. Lançamento OPEN com valor R$ 1.000
2. Baixa R$ 400 → `amountPaid=400`, status `PARTIAL`, movimento no razão R$ 400
3. Baixa R$ 600 → `amountPaid=1000`, status `PAID`, segundo movimento no razão
4. Estorno → movimentos inversos, status `REVERSED`

## Permissões

- `financial.manage` / `financial.view` — acesso geral ao módulo
- `financial.accounts.manage` — gestão de contas (seed em `system-permissions.ts`)

## Validação de saldos

Conferir periodicamente:

```typescript
// LedgerService.recomputeAllBalances(organizationId)
// Saldo da conta = openingBalance + Σ(CREDIT) - Σ(DEBIT)
```

Arredondamento: `Math.round(x * 100) / 100`.

## Integrações futuras

- **OFX**: importação via `externalRef` + conciliação automática
- **Split maquininha**: múltiplos movimentos por recebível de cartão
- **DRE gerencial por centro de custo**: UI dedicada consumindo reports estendidos
- **Multi-conta por baixa**: splits já suportam `accountId` distinto por forma

## Ordem de deploy

1. `npm run db:migrate` (ou `db:deploy` em produção)
2. `npm run generate` (Prisma client)
3. `node packages/database/scripts/backfill-ledger.mjs`
4. Conferir saldos (razão × `currentBalance`)
5. Deploy API + frontend

## Arquivos principais

| Área | Caminho |
|------|---------|
| Schema | `packages/database/prisma/schema.prisma` |
| Migration | `packages/database/prisma/migrations/20260703200000_erp_financeiro_profissional/` |
| Ledger | `apps/api/src/ledger/ledger.service.ts` |
| Contas | `apps/api/src/accounts/` |
| Financeiro | `apps/api/src/financial/financial.service.ts` |
| Equity | `apps/api/src/equity/` |
| Empréstimos | `apps/api/src/loans/` |
| Fluxo/Conciliação | `apps/api/src/cashflow/` |
| Layout UI | `app/src/layouts/FinancialLayout.tsx` |
| Backfill | `packages/database/scripts/backfill-ledger.mjs` |
