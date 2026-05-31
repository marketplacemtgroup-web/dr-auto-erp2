-- AlterTable
ALTER TABLE "customers" ADD COLUMN "notes" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN "location" TEXT;

-- AlterTable
ALTER TABLE "service_orders" ADD COLUMN "complaint" TEXT;
ALTER TABLE "service_orders" ADD COLUMN "diagnosis" TEXT;
ALTER TABLE "service_orders" ADD COLUMN "internal_notes" TEXT;

-- CreateEnum
CREATE TYPE "ServiceOrderItemType" AS ENUM ('SERVICE', 'PART');

-- CreateTable
CREATE TABLE "service_order_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "product_id" TEXT,
    "description" TEXT NOT NULL,
    "item_type" "ServiceOrderItemType" NOT NULL DEFAULT 'SERVICE',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_order_items_service_order_id_idx" ON "service_order_items"("service_order_id");

-- AddForeignKey
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
