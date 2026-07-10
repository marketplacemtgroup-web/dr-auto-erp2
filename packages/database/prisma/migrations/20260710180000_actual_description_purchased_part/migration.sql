-- AlterEnum
ALTER TYPE "ServiceOrderItemCostField" ADD VALUE IF NOT EXISTS 'ACTUAL_DESCRIPTION';

-- AlterTable
ALTER TABLE "service_order_items" ADD COLUMN IF NOT EXISTS "actual_description" TEXT;
