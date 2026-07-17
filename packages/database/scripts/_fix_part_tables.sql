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
