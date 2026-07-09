-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'PROVISIONAL');

-- CreateEnum
CREATE TYPE "ServiceOrderItemCostField" AS ENUM (
  'ACTUAL_UNIT_COST',
  'ACTUAL_BRAND',
  'ACTUAL_SUPPLIER',
  'PURCHASE_ORDER_ITEM',
  'PURCHASE_DATE',
  'PURCHASE_PAYMENT_METHOD',
  'INTERNAL_NOTES'
);

-- AlterTable products
ALTER TABLE "products" ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "products" ADD COLUMN "needs_review" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "source_service_order_item_id" TEXT;
ALTER TABLE "products" ADD COLUMN "source_quote_id" TEXT;

-- AlterTable service_order_items
ALTER TABLE "service_order_items" ADD COLUMN "is_quick_part" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "service_order_items" ADD COLUMN "quick_part_code" TEXT;
ALTER TABLE "service_order_items" ADD COLUMN "part_brand" TEXT;
ALTER TABLE "service_order_items" ADD COLUMN "suggested_supplier_id" TEXT;
ALTER TABLE "service_order_items" ADD COLUMN "internal_notes" TEXT;
ALTER TABLE "service_order_items" ADD COLUMN "actual_unit_cost" DECIMAL(12,2);
ALTER TABLE "service_order_items" ADD COLUMN "actual_brand" TEXT;
ALTER TABLE "service_order_items" ADD COLUMN "actual_supplier_id" TEXT;
ALTER TABLE "service_order_items" ADD COLUMN "purchase_order_item_id" TEXT;
ALTER TABLE "service_order_items" ADD COLUMN "purchase_date" TIMESTAMP(3);
ALTER TABLE "service_order_items" ADD COLUMN "purchase_payment_method" TEXT;
ALTER TABLE "service_order_items" ADD COLUMN "commercial_locked_at" TIMESTAMP(3);
ALTER TABLE "service_order_items" ADD COLUMN "stock_deducted_at" TIMESTAMP(3);

-- AlterTable purchase_order_items
ALTER TABLE "purchase_order_items" ADD COLUMN "service_order_item_id" TEXT;

-- CreateTable
CREATE TABLE "service_order_item_cost_history" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "service_order_item_id" TEXT NOT NULL,
    "user_id" TEXT,
    "field" "ServiceOrderItemCostField" NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_item_cost_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_organization_id_status_idx" ON "products"("organization_id", "status");
CREATE INDEX "products_organization_id_needs_review_idx" ON "products"("organization_id", "needs_review");
CREATE INDEX "service_order_items_organization_id_is_quick_part_idx" ON "service_order_items"("organization_id", "is_quick_part");
CREATE INDEX "purchase_order_items_service_order_item_id_idx" ON "purchase_order_items"("service_order_item_id");
CREATE INDEX "service_order_item_cost_history_service_order_item_id_cre_idx" ON "service_order_item_cost_history"("service_order_item_id", "created_at");

-- AddForeignKey
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_suggested_supplier_id_fkey" FOREIGN KEY ("suggested_supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_actual_supplier_id_fkey" FOREIGN KEY ("actual_supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_service_order_item_id_fkey" FOREIGN KEY ("service_order_item_id") REFERENCES "service_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_order_item_cost_history" ADD CONSTRAINT "service_order_item_cost_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_order_item_cost_history" ADD CONSTRAINT "service_order_item_cost_history_service_order_item_id_fkey" FOREIGN KEY ("service_order_item_id") REFERENCES "service_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_order_item_cost_history" ADD CONSTRAINT "service_order_item_cost_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
