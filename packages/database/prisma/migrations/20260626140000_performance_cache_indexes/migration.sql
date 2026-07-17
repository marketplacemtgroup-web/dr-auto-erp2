-- DashboardCache table
CREATE TABLE "dashboard_cache" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expenses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ticket_average" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "service_orders" INTEGER NOT NULL DEFAULT 0,
    "closed_orders" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dashboard_cache_organization_id_date_key" ON "dashboard_cache"("organization_id", "date");
CREATE INDEX "dashboard_cache_organization_id_date_idx" ON "dashboard_cache"("organization_id", "date");

ALTER TABLE "dashboard_cache" ADD CONSTRAINT "dashboard_cache_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Performance indexes (idempotent via IF NOT EXISTS where supported)
CREATE INDEX IF NOT EXISTS "idx_service_orders_org_status" ON "service_orders"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "idx_service_orders_org_created" ON "service_orders"("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_service_orders_org_updated" ON "service_orders"("organization_id", "updated_at");
CREATE INDEX IF NOT EXISTS "idx_service_orders_vehicle" ON "service_orders"("vehicle_id");

CREATE INDEX IF NOT EXISTS "idx_quotes_org_status" ON "quotes"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "idx_quotes_org_created" ON "quotes"("organization_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_customers_org" ON "customers"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_vehicles_org_customer" ON "vehicles"("organization_id", "customer_id");

CREATE INDEX IF NOT EXISTS "idx_financial_entries_org_status" ON "financial_entries"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "idx_financial_entries_org_paid" ON "financial_entries"("organization_id", "paid_at");

CREATE INDEX IF NOT EXISTS "idx_products_org" ON "products"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_attachments_org_so" ON "attachments"("organization_id", "service_order_id");

CREATE INDEX IF NOT EXISTS "idx_maintenance_reminders_org_status" ON "maintenance_reminders"("organization_id", "status");
