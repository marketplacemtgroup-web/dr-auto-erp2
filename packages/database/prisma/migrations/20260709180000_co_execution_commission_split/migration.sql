-- AlterTable
ALTER TABLE "service_orders" ADD COLUMN "co_execution_by_id" TEXT;

-- AlterTable
ALTER TABLE "service_order_items" ADD COLUMN "co_executor_id" TEXT;
ALTER TABLE "service_order_items" ADD COLUMN "co_executor_split_pct" INTEGER;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_co_execution_by_id_fkey" FOREIGN KEY ("co_execution_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_co_executor_id_fkey" FOREIGN KEY ("co_executor_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "service_order_items_co_executor_id_idx" ON "service_order_items"("co_executor_id");
