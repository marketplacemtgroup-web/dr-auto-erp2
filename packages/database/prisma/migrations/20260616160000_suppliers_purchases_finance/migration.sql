-- Enums
CREATE TYPE "PurchaseFinancialStatus" AS ENUM ('NOT_GENERATED', 'OPEN', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "PurchaseStockStatus" AS ENUM ('NOT_POSTED', 'PARTIAL', 'POSTED', 'NO_STOCK');
CREATE TYPE "PurchaseType" AS ENUM ('STOCK_PRODUCTS', 'OS_PARTS', 'SUPPLIES', 'TOOLS', 'THIRD_PARTY_SERVICE', 'OPERATIONAL_EXPENSE', 'OTHER');
CREATE TYPE "SupplierPersonType" AS ENUM ('PJ', 'PF');
CREATE TYPE "SupplierType" AS ENUM ('AUTOPECAS', 'MOTOPECAS', 'FERRAMENTAS', 'LUBRIFICANTES', 'PNEUS', 'ELETRICA', 'FUNILARIA', 'TERCEIRIZADO', 'OUTROS');
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "FinancialEntryOrigin" AS ENUM ('MANUAL', 'PURCHASE', 'SERVICE_ORDER', 'PAYROLL', 'COMMISSION', 'EXPENSE', 'ADJUSTMENT');
CREATE TYPE "FinancialCategoryType" AS ENUM ('INCOME', 'EXPENSE');

ALTER TYPE "PurchaseOrderStatus" ADD VALUE IF NOT EXISTS 'ORDER_SENT';
ALTER TYPE "PurchaseOrderStatus" ADD VALUE IF NOT EXISTS 'AWAITING_RECEIPT';
ALTER TYPE "PurchaseOrderStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_RECEIVED';

-- Suppliers
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_type" "SupplierPersonType" NOT NULL DEFAULT 'PJ',
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "document" TEXT,
    "state_registration" TEXT,
    "municipal_registration" TEXT,
    "supplier_type" "SupplierType" NOT NULL DEFAULT 'OUTROS',
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "contact_name" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "website" TEXT,
    "service_notes" TEXT,
    "zip_code" TEXT,
    "street" TEXT,
    "address_number" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "complement" TEXT,
    "tax_email" TEXT,
    "tax_notes" TEXT,
    "default_payment_days" INTEGER,
    "default_payment_method" "PaymentMethod",
    "pix_key" TEXT,
    "credit_limit" DECIMAL(12,2),
    "commercial_notes" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "suppliers_organization_id_idx" ON "suppliers"("organization_id");
CREATE INDEX "suppliers_organization_id_status_idx" ON "suppliers"("organization_id", "status");

ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Expand purchase_orders
ALTER TABLE "purchase_orders" ADD COLUMN "supplier_id" TEXT;
ALTER TABLE "purchase_orders" ADD COLUMN "purchase_type" "PurchaseType" NOT NULL DEFAULT 'STOCK_PRODUCTS';
ALTER TABLE "purchase_orders" ADD COLUMN "service_order_id" TEXT;
ALTER TABLE "purchase_orders" ADD COLUMN "invoice_number" TEXT;
ALTER TABLE "purchase_orders" ADD COLUMN "invoice_key" TEXT;
ALTER TABLE "purchase_orders" ADD COLUMN "order_date" DATE;
ALTER TABLE "purchase_orders" ADD COLUMN "expected_date" DATE;
ALTER TABLE "purchase_orders" ADD COLUMN "received_date" DATE;
ALTER TABLE "purchase_orders" ADD COLUMN "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "purchase_orders" ADD COLUMN "freight" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "purchase_orders" ADD COLUMN "insurance" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "purchase_orders" ADD COLUMN "other_expenses" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "purchase_orders" ADD COLUMN "discount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "purchase_orders" ADD COLUMN "surcharge" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "purchase_orders" ADD COLUMN "financial_status" "PurchaseFinancialStatus" NOT NULL DEFAULT 'NOT_GENERATED';
ALTER TABLE "purchase_orders" ADD COLUMN "stock_status" "PurchaseStockStatus" NOT NULL DEFAULT 'NOT_POSTED';
ALTER TABLE "purchase_orders" ADD COLUMN "payment_terms" JSONB;
ALTER TABLE "purchase_orders" ADD COLUMN "notes" TEXT;
ALTER TABLE "purchase_orders" ADD COLUMN "created_by_user_id" TEXT;

ALTER TABLE "purchase_orders" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Purchase order items
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "product_id" TEXT,
    "supplier_product_code" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allocated_freight" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allocated_expenses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "final_unit_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "moves_stock" BOOLEAN NOT NULL DEFAULT true,
    "location" TEXT,
    "service_order_id" TEXT,
    "quantity_received" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");
CREATE INDEX "purchase_order_items_product_id_idx" ON "purchase_order_items"("product_id");

ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Products cost fields
ALTER TABLE "products" ADD COLUMN "average_cost" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN "last_purchase_cost" DECIMAL(12,2);
ALTER TABLE "products" ADD COLUMN "last_purchase_at" TIMESTAMP(3);
ALTER TABLE "products" ADD COLUMN "last_supplier_id" TEXT;

ALTER TABLE "products" ADD CONSTRAINT "products_last_supplier_id_fkey" FOREIGN KEY ("last_supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Stock movements purchase links
ALTER TABLE "stock_movements" ADD COLUMN "purchase_order_id" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN "purchase_order_item_id" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN "supplier_id" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN "unit_cost" DECIMAL(12,2);
ALTER TABLE "stock_movements" ADD COLUMN "total_cost" DECIMAL(12,2);

CREATE INDEX "stock_movements_purchase_order_id_idx" ON "stock_movements"("purchase_order_id");

ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Service order items unit cost snapshot
ALTER TABLE "service_order_items" ADD COLUMN "unit_cost" DECIMAL(12,2);

-- Financial extensions
ALTER TABLE "financial_entries" ADD COLUMN "supplier_id" TEXT;
ALTER TABLE "financial_entries" ADD COLUMN "purchase_order_id" TEXT;
ALTER TABLE "financial_entries" ADD COLUMN "financial_category_id" TEXT;
ALTER TABLE "financial_entries" ADD COLUMN "origin" "FinancialEntryOrigin" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "financial_entries" ADD COLUMN "interest_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "financial_entries" ADD COLUMN "penalty_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "financial_entries" ADD COLUMN "fee_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE INDEX "financial_entries_supplier_id_idx" ON "financial_entries"("supplier_id");
CREATE INDEX "financial_entries_purchase_order_id_idx" ON "financial_entries"("purchase_order_id");

ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "financial_categories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialCategoryType" NOT NULL,
    "group_name" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_categories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "financial_categories_organization_id_type_idx" ON "financial_categories"("organization_id", "type");

ALTER TABLE "financial_categories" ADD CONSTRAINT "financial_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_financial_category_id_fkey" FOREIGN KEY ("financial_category_id") REFERENCES "financial_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "payment_fee_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "label" TEXT NOT NULL,
    "fee_percent" DECIMAL(5,2) NOT NULL,
    "installments" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_fee_configs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_fee_configs_organization_id_payment_method_idx" ON "payment_fee_configs"("organization_id", "payment_method");

ALTER TABLE "payment_fee_configs" ADD CONSTRAINT "payment_fee_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "payment_fee_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "financial_entry_id" TEXT NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "gross_amount" DECIMAL(12,2) NOT NULL,
    "fee_percent" DECIMAL(5,2) NOT NULL,
    "fee_amount" DECIMAL(12,2) NOT NULL,
    "net_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_fee_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_fee_records_financial_entry_id_idx" ON "payment_fee_records"("financial_entry_id");

ALTER TABLE "payment_fee_records" ADD CONSTRAINT "payment_fee_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_fee_records" ADD CONSTRAINT "payment_fee_records_financial_entry_id_fkey" FOREIGN KEY ("financial_entry_id") REFERENCES "financial_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
