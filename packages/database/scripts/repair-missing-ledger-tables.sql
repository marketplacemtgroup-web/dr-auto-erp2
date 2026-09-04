-- Idempotent repair: missing ledger tables from erp_financeiro_profissional
-- (migration was marked applied but tables were never created)

DO $$ BEGIN
  CREATE TYPE "FinancialAccountType" AS ENUM ('CAIXA', 'BANCO', 'CARTEIRA_DIGITAL', 'MAQUININHA', 'COFRE', 'SOCIO_PF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FinancialAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LedgerDirection" AS ENUM ('CREDIT', 'DEBIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LedgerMovementKind" AS ENUM ('RECEIVABLE', 'PAYABLE', 'TRANSFER_IN', 'TRANSFER_OUT', 'CONTRIBUTION', 'WITHDRAWAL', 'LOAN_IN', 'LOAN_PAYMENT', 'ADJUSTMENT', 'FEE', 'SUPPLY', 'WITHDRAWAL_CASH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'CONCILIATED', 'DIFFERENCE', 'ADJUSTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REVERSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PartnerWithdrawalType" AS ENUM ('PRO_LABORE', 'LUCROS', 'PARTICULAR', 'ADIANTAMENTO', 'OUTRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'PAID', 'CANCELLED', 'DEFAULTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LoanInstallmentStatus" AS ENUM ('OPEN', 'PAID', 'OVERDUE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "financial_transfers" (
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "financial_transfers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "financial_transfers_organization_id_transfer_date_idx" ON "financial_transfers"("organization_id", "transfer_date");

DO $$ BEGIN
  ALTER TABLE "financial_transfers" ADD CONSTRAINT "financial_transfers_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "financial_transfers" ADD CONSTRAINT "financial_transfers_from_account_id_fkey"
    FOREIGN KEY ("from_account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "financial_transfers" ADD CONSTRAINT "financial_transfers_to_account_id_fkey"
    FOREIGN KEY ("to_account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "capital_contributions" (
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

CREATE INDEX IF NOT EXISTS "capital_contributions_organization_id_contribution_date_idx" ON "capital_contributions"("organization_id", "contribution_date");

DO $$ BEGIN
  ALTER TABLE "capital_contributions" ADD CONSTRAINT "capital_contributions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "capital_contributions" ADD CONSTRAINT "capital_contributions_to_account_id_fkey"
    FOREIGN KEY ("to_account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "partner_withdrawals" (
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

CREATE INDEX IF NOT EXISTS "partner_withdrawals_organization_id_withdrawal_date_idx" ON "partner_withdrawals"("organization_id", "withdrawal_date");

DO $$ BEGIN
  ALTER TABLE "partner_withdrawals" ADD CONSTRAINT "partner_withdrawals_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "partner_withdrawals" ADD CONSTRAINT "partner_withdrawals_from_account_id_fkey"
    FOREIGN KEY ("from_account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "loans" (
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "loans_organization_id_status_idx" ON "loans"("organization_id", "status");

DO $$ BEGIN
  ALTER TABLE "loans" ADD CONSTRAINT "loans_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "loans" ADD CONSTRAINT "loans_destination_account_id_fkey"
    FOREIGN KEY ("destination_account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "loan_installments" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "loan_installments_financial_entry_id_key" ON "loan_installments"("financial_entry_id");
CREATE INDEX IF NOT EXISTS "loan_installments_loan_id_idx" ON "loan_installments"("loan_id");
CREATE INDEX IF NOT EXISTS "loan_installments_organization_id_due_date_idx" ON "loan_installments"("organization_id", "due_date");

DO $$ BEGIN
  ALTER TABLE "loan_installments" ADD CONSTRAINT "loan_installments_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "loan_installments" ADD CONSTRAINT "loan_installments_loan_id_fkey"
    FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "loan_installments" ADD CONSTRAINT "loan_installments_financial_entry_id_fkey"
    FOREIGN KEY ("financial_entry_id") REFERENCES "financial_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "financial_account_movements" (
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

CREATE INDEX IF NOT EXISTS "financial_account_movements_organization_id_account_id_movement_date_idx"
    ON "financial_account_movements"("organization_id", "account_id", "movement_date");
CREATE INDEX IF NOT EXISTS "financial_account_movements_financial_entry_id_idx" ON "financial_account_movements"("financial_entry_id");
CREATE INDEX IF NOT EXISTS "financial_account_movements_transfer_id_idx" ON "financial_account_movements"("transfer_id");

DO $$ BEGIN
  ALTER TABLE "financial_account_movements" ADD CONSTRAINT "financial_account_movements_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "financial_account_movements" ADD CONSTRAINT "financial_account_movements_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "financial_account_movements" ADD CONSTRAINT "financial_account_movements_financial_entry_id_fkey"
    FOREIGN KEY ("financial_entry_id") REFERENCES "financial_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "financial_account_movements" ADD CONSTRAINT "financial_account_movements_transfer_id_fkey"
    FOREIGN KEY ("transfer_id") REFERENCES "financial_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "financial_account_movements" ADD CONSTRAINT "financial_account_movements_contribution_id_fkey"
    FOREIGN KEY ("contribution_id") REFERENCES "capital_contributions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "financial_account_movements" ADD CONSTRAINT "financial_account_movements_withdrawal_id_fkey"
    FOREIGN KEY ("withdrawal_id") REFERENCES "partner_withdrawals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "financial_account_movements" ADD CONSTRAINT "financial_account_movements_loan_id_fkey"
    FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "financial_account_movements" ADD CONSTRAINT "financial_account_movements_loan_installment_id_fkey"
    FOREIGN KEY ("loan_installment_id") REFERENCES "loan_installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "bank_reconciliations" (
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

CREATE INDEX IF NOT EXISTS "bank_reconciliations_organization_id_account_id_idx" ON "bank_reconciliations"("organization_id", "account_id");

DO $$ BEGIN
  ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
