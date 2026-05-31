-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinancialEntryType" AS ENUM ('PAYABLE', 'RECEIVABLE');

-- CreateEnum
CREATE TYPE "FinancialEntryStatus" AS ENUM ('OPEN', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'ORDERED',
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_entries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "FinancialEntryType" NOT NULL,
    "status" "FinancialEntryStatus" NOT NULL DEFAULT 'OPEN',
    "due_date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_orders_organization_id_status_idx" ON "purchase_orders"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_organization_id_number_key" ON "purchase_orders"("organization_id", "number");

-- CreateIndex
CREATE INDEX "financial_entries_organization_id_due_date_idx" ON "financial_entries"("organization_id", "due_date");

-- CreateIndex
CREATE INDEX "financial_entries_organization_id_status_idx" ON "financial_entries"("organization_id", "status");

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
