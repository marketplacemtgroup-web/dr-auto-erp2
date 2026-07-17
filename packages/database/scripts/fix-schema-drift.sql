-- Reparar drift: migrations marcadas aplicadas sem schema real
-- Scalibur / zejpaxphyaufrwdholyx

-- ========== closed_at (causa do 500 no dashboard/summary) ==========
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMP(3);

UPDATE "service_orders" so
SET "closed_at" = sub.first_closed
FROM (
  SELECT "service_order_id", MIN("created_at") AS first_closed
  FROM "service_order_status_history"
  WHERE "to_status" IN ('FINISHED', 'DELIVERED', 'AWAITING_PAYMENT')
  GROUP BY "service_order_id"
) sub
WHERE so."id" = sub."service_order_id" AND so."closed_at" IS NULL;

UPDATE "service_orders"
SET "closed_at" = "updated_at"
WHERE "closed_at" IS NULL
  AND "status" IN ('FINISHED', 'DELIVERED', 'AWAITING_PAYMENT');

-- ========== quotes free_text (schema Prisma atual) ==========
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "free_text_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "free_text_content" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "free_text_amount" DECIMAL(12,2);

-- Backfill a partir de summary_* se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='quotes' AND column_name='summary_mode'
  ) THEN
    EXECUTE $q$
      UPDATE "quotes"
      SET
        "free_text_enabled" = COALESCE("summary_mode", false),
        "free_text_content" = COALESCE("free_text_content", "summary_text"),
        "free_text_amount" = COALESCE("free_text_amount", "summary_amount")
      WHERE "free_text_enabled" = false
        AND ("summary_mode" = true OR "summary_text" IS NOT NULL OR "summary_amount" IS NOT NULL)
    $q$;
  END IF;
END $$;

-- ========== fixed_expenses ==========
CREATE TABLE IF NOT EXISTS "fixed_expenses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#DC2626',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fixed_expenses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "fixed_expenses_organization_id_idx" ON "fixed_expenses"("organization_id");
DO $$ BEGIN
  ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========== outsourced_services ==========
CREATE TABLE IF NOT EXISTS "outsourced_services" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "category" TEXT,
    "cost_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sale_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "outsourced_services_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "outsourced_services_organization_id_is_active_idx"
  ON "outsourced_services"("organization_id", "is_active");
DO $$ BEGIN
  ALTER TABLE "outsourced_services" ADD CONSTRAINT "outsourced_services_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "service_order_items" ADD COLUMN IF NOT EXISTS "outsourced_service_id" TEXT;
DO $$ BEGIN
  ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_outsourced_service_id_fkey"
    FOREIGN KEY ("outsourced_service_id") REFERENCES "outsourced_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========== enums financeiro ==========
DO $$ BEGIN CREATE TYPE "FinancialAccountType" AS ENUM ('CAIXA', 'BANCO', 'CARTEIRA_DIGITAL', 'MAQUININHA', 'COFRE', 'SOCIO_PF'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FinancialAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LedgerDirection" AS ENUM ('CREDIT', 'DEBIT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LedgerMovementKind" AS ENUM ('RECEIVABLE', 'PAYABLE', 'TRANSFER_IN', 'TRANSFER_OUT', 'CONTRIBUTION', 'WITHDRAWAL', 'LOAN_IN', 'LOAN_PAYMENT', 'ADJUSTMENT', 'FEE', 'SUPPLY', 'WITHDRAWAL_CASH'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'CONCILIATED', 'DIFFERENCE', 'ADJUSTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REVERSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PartnerWithdrawalType" AS ENUM ('PRO_LABORE', 'LUCROS', 'PARTICULAR', 'ADIANTAMENTO', 'OUTRO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'PAID', 'CANCELLED', 'DEFAULTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LoanInstallmentStatus" AS ENUM ('OPEN', 'PAID', 'OVERDUE', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE "FinancialEntryOrigin" ADD VALUE IF NOT EXISTS 'TRANSFER';
ALTER TYPE "FinancialEntryOrigin" ADD VALUE IF NOT EXISTS 'CONTRIBUTION';
ALTER TYPE "FinancialEntryOrigin" ADD VALUE IF NOT EXISTS 'WITHDRAWAL';
ALTER TYPE "FinancialEntryOrigin" ADD VALUE IF NOT EXISTS 'LOAN';
ALTER TYPE "FinancialEntryStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';
ALTER TYPE "FinancialEntryStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';
ALTER TYPE "FinancialEntryStatus" ADD VALUE IF NOT EXISTS 'REVERSED';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'LOSS';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'TRANSFER';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'INVENTORY';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'DEVOLUTION';

-- ========== financial_accounts + related ==========
CREATE TABLE IF NOT EXISTS "financial_accounts" (
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "financial_accounts_organization_id_status_idx"
  ON "financial_accounts"("organization_id", "status");
DO $$ BEGIN
  ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "cost_centers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "cost_centers_organization_id_name_key" ON "cost_centers"("organization_id", "name");
CREATE INDEX IF NOT EXISTS "cost_centers_organization_id_idx" ON "cost_centers"("organization_id");
DO $$ BEGIN
  ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "account_id" TEXT;
ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "cost_center_id" TEXT;
ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "document_type" TEXT;
ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "document_number" TEXT;
ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "issue_date" DATE;
ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "attachment_url" TEXT;
ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "reversed_at" TIMESTAMP(3);
ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "reversed_by_user_id" TEXT;
ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "reversal_reason" TEXT;
CREATE INDEX IF NOT EXISTS "financial_entries_account_id_idx" ON "financial_entries"("account_id");
CREATE INDEX IF NOT EXISTS "financial_entries_cost_center_id_idx" ON "financial_entries"("cost_center_id");

ALTER TABLE "financial_payment_splits" ADD COLUMN IF NOT EXISTS "account_id" TEXT;
CREATE INDEX IF NOT EXISTS "financial_payment_splits_account_id_idx" ON "financial_payment_splits"("account_id");

ALTER TABLE "cash_register_sessions" ADD COLUMN IF NOT EXISTS "account_id" TEXT;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "internal_code" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "subcategory" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "cest" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unit" TEXT DEFAULT 'UN';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "weight" DECIMAL(10,3);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "max_stock" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "markup" DECIMAL(5,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "ipi" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "icms" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- FKs financial_entries -> accounts/cost_centers
DO $$ BEGIN
  ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_cost_center_id_fkey"
    FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "financial_payment_splits" ADD CONSTRAINT "financial_payment_splits_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "cash_register_sessions" ADD CONSTRAINT "cash_register_sessions_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill conta principal + centros de custo
INSERT INTO "financial_accounts" (
  "id", "organization_id", "name", "type", "opening_balance", "current_balance",
  "status", "color", "allows_movement", "is_primary", "created_at", "updated_at"
)
SELECT
  'caixa_' || o."id", o."id", 'Caixa Principal', 'CAIXA'::"FinancialAccountType",
  0, 0, 'ACTIVE'::"FinancialAccountStatus", '#16A34A', true, true, NOW(), NOW()
FROM "organizations" o
WHERE NOT EXISTS (
  SELECT 1 FROM "financial_accounts" fa
  WHERE fa."organization_id" = o."id" AND fa."is_primary" = true
);

INSERT INTO "cost_centers" ("id", "organization_id", "name", "is_system", "is_active", "created_at")
SELECT
  'cc_' || o."id" || '_' || REPLACE(LOWER(cc.name), ' ', '_'),
  o."id", cc.name, true, true, NOW()
FROM "organizations" o
CROSS JOIN (VALUES
  ('Oficina'), ('Administracao'), ('Estoque'), ('Recepcao'),
  ('Marketing'), ('Financeiro'), ('Outros')
) AS cc(name)
WHERE NOT EXISTS (
  SELECT 1 FROM "cost_centers" c
  WHERE c."organization_id" = o."id" AND c."name" = cc.name
);
