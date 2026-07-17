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
