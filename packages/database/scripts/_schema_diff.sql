node.exe : warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please 
migrate to a Prisma config file (e.g., `prisma.config.ts`).
No linha:1 caractere:1
+ & "C:\Program Files\nodejs/node.exe" "C:\Users\rlisb\AppData\Roaming\ ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (warn The config...ma.config.ts`).:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
 
For more information, see: https://pris.ly/prisma-config

-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('CAIXA', 'BANCO', 'CARTEIRA_DIGITAL', 'MAQUININHA', 'COFRE', 'SOCIO_PF');

-- CreateEnum
CREATE TYPE "FinancialAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "LedgerMovementKind" AS ENUM ('RECEIVABLE', 'PAYABLE', 'TRANSFER_IN', 'TRANSFER_OUT', 'CONTRIBUTION', 'WITHDRAWAL', 'LOAN_IN', 'LOAN_PAYMENT', 'ADJUSTMENT', 'FEE', 'SUPPLY', 'WITHDRAWAL_CASH');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'CONCILIATED', 'DIFFERENCE', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PartnerWithdrawalType" AS ENUM ('PRO_LABORE', 'LUCROS', 'PARTICULAR', 'ADIANTAMENTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'PAID', 'CANCELLED', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "LoanInstallmentStatus" AS ENUM ('OPEN', 'PAID', 'OVERDUE', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FinancialEntryOrigin" ADD VALUE 'TRANSFER';
ALTER TYPE "FinancialEntryOrigin" ADD VALUE 'CONTRIBUTION';
ALTER TYPE "FinancialEntryOrigin" ADD VALUE 'WITHDRAWAL';
ALTER TYPE "FinancialEntryOrigin" ADD VALUE 'LOAN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FinancialEntryStatus" ADD VALUE 'PARTIAL';
ALTER TYPE "FinancialEntryStatus" ADD VALUE 'OVERDUE';
ALTER TYPE "FinancialEntryStatus" ADD VALUE 'REVERSED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StockMovementType" ADD VALUE 'LOSS';
ALTER TYPE "StockMovementType" ADD VALUE 'TRANSFER';
ALTER TYPE "StockMovementType" ADD VALUE 'INVENTORY';
ALTER TYPE "StockMovementType" ADD VALUE 'DEVOLUTION';

-- DropIndex
DROP INDEX "idx_attachments_org_so";

-- DropIndex
DROP INDEX "idx_financial_entries_org_paid";

-- DropIndex
DROP INDEX "idx_quotes_org_created";

-- DropIndex
DROP INDEX "service_order_items_co_executor_id_idx";

-- DropIndex
DROP INDEX "idx_service_orders_org_created";

-- DropIndex
DROP INDEX "idx_service_orders_org_updated";

-- DropIndex
DROP INDEX "idx_service_orders_vehicle";

-- DropIndex
DROP INDEX "idx_vehicles_org_customer";

-- AlterTable
ALTER TABLE "cash_register_sessions" ADD COLUMN     "account_id" TEXT;

-- AlterTable
ALTER TABLE "dashboard_cache" ALTER COLUMN "revenue" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "expenses" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "profit" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "ticket_average" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "computed_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "financial_entries" ADD COLUMN     "account_id" TEXT,
ADD COLUMN     "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "attachment_url" TEXT,
ADD COLUMN     "cost_center_id" TEXT,
ADD COLUMN     "document_number" TEXT,
ADD COLUMN     "document_type" TEXT,
ADD COLUMN     "issue_date" DATE,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "reversal_reason" TEXT,
ADD COLUMN     "reversed_at" TIMESTAMP(3),
ADD COLUMN     "reversed_by_user_id" TEXT;

-- AlterTable
ALTER TABLE "financial_payment_splits" ADD COLUMN     "account_id" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "cest" TEXT,
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "internal_code" TEXT,
ADD COLUMN     "markup" DECIMAL(5,2),
ADD COLUMN     "max_stock" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "subcategory" TEXT,
ADD COLUMN     "unit" TEXT DEFAULT 'UN',
ADD COLUMN     "weight" DECIMAL(10,3);

-- AlterTable
ALTER TABLE "purchase_order_items" ADD COLUMN     "icms" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "ipi" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "quotes" DROP COLUMN "customer_visible_notes",
DROP COLUMN "summary_amount",
DROP COLUMN "summary_mode",
DROP COLUMN "summary_text",
ADD COLUMN     "free_text_amount" DECIMAL(12,2),
ADD COLUMN     "free_text_content" TEXT,
ADD COLUMN     "free_text_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "service_order_items" ADD COLUMN     "outsourced_service_id" TEXT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "service_orders" ADD COLUMN     "closed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "outsourced_services" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "category" TEXT,
    "cost_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sale_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outsourced_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_accounts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialAccountType" NOT NULL DEFAULT 'CAIXA',
    "bank" TEXT,
    "agency" TEXT,
    "account_number" TEXT,
    "holder" TEXT,
    "opening_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "current_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "FinancialAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "color" TEXT NOT NULL DEFAULT '#0E7490',
    "icon" TEXT,
    "allows_movement" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_account_movements" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balance_after" DECIMAL(14,2) NOT NULL,
    "movement_kind" "LedgerMovementKind" NOT NULL,
    "movement_date" DATE NOT NULL,
    "description" TEXT,
    "financial_entry_id" TEXT,
    "transfer_id" TEXT,
    "contribution_id" TEXT,
    "withdrawal_id" TEXT,
    "loan_id" TEXT,
    "loan_installment_id" TEXT,
    "cash_movement_id" TEXT,
    "reconciliation_status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "external_ref" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_account_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transfers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "from_account_id" TEXT NOT NULL,
    "to_account_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "transfer_date" DATE NOT NULL,
    "responsible_user_id" TEXT,
    "notes" TEXT,
    "attachment_url" TEXT,
    "status" "TransferStatus" NOT NULL DEFAULT 'COMPLETED',
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capital_contributions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "partner_name" TEXT NOT NULL,
    "from_account_id" TEXT,
    "to_account_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "contribution_date" DATE NOT NULL,
    "reason" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capital_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_withdrawals" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "partner_name" TEXT NOT NULL,
    "from_account_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "withdrawal_date" DATE NOT NULL,
    "withdrawal_type" "PartnerWithdrawalType" NOT NULL,
    "reason" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "contract_number" TEXT,
    "principal_amount" DECIMAL(14,2) NOT NULL,
    "interest_rate" DECIMAL(5,2),
    "installments" INTEGER NOT NULL DEFAULT 1,
    "installment_amount" DECIMAL(14,2) NOT NULL,
    "first_due_date" DATE NOT NULL,
    "destination_account_id" TEXT NOT NULL,
    "outstanding_balance" DECIMAL(14,2) NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "received_at" DATE,
    "notes" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_installments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "LoanInstallmentStatus" NOT NULL DEFAULT 'OPEN',
    "financial_entry_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_reconciliations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "bank_balance" DECIMAL(14,2) NOT NULL,
    "system_balance" DECIMAL(14,2) NOT NULL,
    "difference" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "reconciled_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_expenses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#DC2626',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outsourced_services_organization_id_is_active_idx" ON "outsourced_services"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "financial_accounts_organization_id_status_idx" ON "financial_accounts"("organization_id", "status");

-- CreateIndex
CREATE INDEX "financial_account_movements_organization_id_account_id_move_idx" ON "financial_account_movements"("organization_id", "account_id", "movement_date");

-- CreateIndex
CREATE INDEX "financial_account_movements_financial_entry_id_idx" ON "financial_account_movements"("financial_entry_id");

-- CreateIndex
CREATE INDEX "financial_account_movements_transfer_id_idx" ON "financial_account_movements"("transfer_id");

-- CreateIndex
CREATE INDEX "cost_centers_organization_id_idx" ON "cost_centers"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_organization_id_name_key" ON "cost_centers"("organization_id", "name");

-- CreateIndex
CREATE INDEX "financial_transfers_organization_id_transfer_date_idx" ON "financial_transfers"("organization_id", "transfer_date");

-- CreateIndex
CREATE INDEX "capital_contributions_organization_id_contribution_date_idx" ON "capital_contributions"("organization_id", "contribution_date");

-- CreateIndex
CREATE INDEX "partner_withdrawals_organization_id_withdrawal_date_idx" ON "partner_withdrawals"("organization_id", "withdrawal_date");

-- CreateIndex
CREATE INDEX "loans_organization_id_status_idx" ON "loans"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "loan_installments_financial_entry_id_key" ON "loan_installments"("financial_entry_id");

-- CreateIndex
CREATE INDEX "loan_installments_loan_id_idx" ON "loan_installments"("loan_id");

-- CreateIndex
CREATE INDEX "loan_installments_organization_id_due_date_idx" ON "loan_installments"("organization_id", "due_date");

-- CreateIndex
CREATE INDEX "bank_reconciliations_organization_id_account_id_idx" ON "bank_reconciliations"("organization_id", "account_id");

-- CreateIndex
CREATE INDEX "fixed_expenses_organization_id_idx" ON "fixed_expenses"("organization_id");

-- CreateIndex
CREATE INDEX "financial_entries_account_id_idx" ON "financial_entries"("account_id");

-- CreateIndex
CREATE INDEX "financial_entries_cost_center_id_idx" ON "financial_entries"("cost_center_id");

-- CreateIndex
CREATE INDEX "financial_payment_splits_account_id_idx" ON "financial_payment_splits"("account_id");

-- AddForeignKey
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_outsourced_service_id_fkey" FOREIGN KEY ("outsourced_service_id") REFERENCES "outsourced_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outsourced_services" ADD CONSTRAINT "outsourced_services_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_movements" ADD CONSTRAINT "financial_account_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_movements" ADD CONSTRAINT "financial_account_movements_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_movements" ADD CONSTRAINT "financial_account_movements_financial_entry_id_fkey" FOREIGN KEY ("financial_entry_id") REFERENCES "financial_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_movements" ADD CONSTRAINT "financial_account_movements_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "financial_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_movements" ADD CONSTRAINT "financial_account_movements_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "capital_contributions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_movements" ADD CONSTRAINT "financial_account_movements_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "partner_withdrawals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_movements" ADD CONSTRAINT "financial_account_movements_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_movements" ADD CONSTRAINT "financial_account_movements_loan_installment_id_fkey" FOREIGN KEY ("loan_installment_id") REFERENCES "loan_installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transfers" ADD CONSTRAINT "financial_transfers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transfers" ADD CONSTRAINT "financial_transfers_from_account_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transfers" ADD CONSTRAINT "financial_transfers_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capital_contributions" ADD CONSTRAINT "capital_contributions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capital_contributions" ADD CONSTRAINT "capital_contributions_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_withdrawals" ADD CONSTRAINT "partner_withdrawals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_withdrawals" ADD CONSTRAINT "partner_withdrawals_from_account_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_destination_account_id_fkey" FOREIGN KEY ("destination_account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_installments" ADD CONSTRAINT "loan_installments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_installments" ADD CONSTRAINT "loan_installments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_installments" ADD CONSTRAINT "loan_installments_financial_entry_id_fkey" FOREIGN KEY ("financial_entry_id") REFERENCES "financial_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_payment_splits" ADD CONSTRAINT "financial_payment_splits_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_register_sessions" ADD CONSTRAINT "cash_register_sessions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "employee_schedules_organization_id_employee_id_schedule_date_id" RENAME TO "employee_schedules_organization_id_employee_id_schedule_dat_idx";

-- RenameIndex
ALTER INDEX "employee_time_clock_entries_organization_id_employee_id_entry_d" RENAME TO "employee_time_clock_entries_organization_id_employee_id_ent_idx";

-- RenameIndex
ALTER INDEX "service_order_item_cost_history_service_order_item_id_cre_idx" RENAME TO "service_order_item_cost_history_service_order_item_id_creat_idx";

