-- Fase 3: catálogo de serviços, movimentação de estoque, agenda

CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT_OS', 'RESERVE', 'RELEASE', 'ADJUST', 'RETURN');
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

CREATE TABLE "service_catalog" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "estimated_minutes" INTEGER,
    "default_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "warranty_days" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_catalog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "service_catalog" ADD CONSTRAINT "service_catalog_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "service_catalog_organization_id_is_active_idx" ON "service_catalog"("organization_id", "is_active");

ALTER TABLE "products" ADD COLUMN "category" TEXT;
ALTER TABLE "products" ADD COLUMN "brand" TEXT;
ALTER TABLE "products" ADD COLUMN "ncm" TEXT;
ALTER TABLE "products" ADD COLUMN "reserved_stock" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "movement_type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" TEXT,
    "service_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "stock_movements_organization_id_product_id_idx" ON "stock_movements"("organization_id", "product_id");
CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements"("created_at");

CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "mechanic_member_id" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "bay" TEXT,
    "notes" TEXT,
    "service_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_mechanic_member_id_fkey" FOREIGN KEY ("mechanic_member_id") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "appointments_service_order_id_key" ON "appointments"("service_order_id");
CREATE INDEX "appointments_organization_id_scheduled_at_idx" ON "appointments"("organization_id", "scheduled_at");
CREATE INDEX "appointments_vehicle_id_idx" ON "appointments"("vehicle_id");

ALTER TABLE "service_order_items" ADD COLUMN "catalog_item_id" TEXT;
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "service_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
