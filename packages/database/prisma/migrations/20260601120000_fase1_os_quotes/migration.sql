-- AlterEnum
ALTER TYPE "ServiceOrderStatus" ADD VALUE 'PAUSED';
ALTER TYPE "ServiceOrderStatus" ADD VALUE 'AWAITING_PAYMENT';

-- CreateEnum
CREATE TYPE "ServiceOrderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "ChecklistResult" AS ENUM ('OK', 'ATTENTION', 'DAMAGED', 'NA');
CREATE TYPE "AttachmentEntityType" AS ENUM ('SERVICE_ORDER', 'VEHICLE', 'CUSTOMER');
CREATE TYPE "QuoteLineType" AS ENUM ('SERVICE', 'PART', 'THIRD_PARTY');

-- AlterTable
ALTER TABLE "service_orders" ADD COLUMN "consultant_member_id" TEXT,
ADD COLUMN "mechanic_member_id" TEXT,
ADD COLUMN "priority" "ServiceOrderPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN "service_type" TEXT,
ADD COLUMN "entry_channel" TEXT,
ADD COLUMN "bay" TEXT,
ADD COLUMN "entry_km" INTEGER,
ADD COLUMN "entered_at" TIMESTAMP(3),
ADD COLUMN "customer_visible_notes" TEXT;

ALTER TABLE "quotes" ADD COLUMN "number" INTEGER,
ADD COLUMN "valid_until" DATE,
ADD COLUMN "terms" TEXT,
ADD COLUMN "customer_comment" TEXT;

-- CreateTable
CREATE TABLE "service_order_status_history" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "from_status" "ServiceOrderStatus",
    "to_status" "ServiceOrderStatus" NOT NULL,
    "user_id" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_order_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_order_checklist_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "result" "ChecklistResult",
    "notes" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "service_order_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_type" "AttachmentEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "service_order_id" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "visible_to_customer" BOOLEAN NOT NULL DEFAULT false,
    "show_on_quote" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_lines" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "line_type" "QuoteLineType" NOT NULL DEFAULT 'SERVICE',
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "approved" BOOLEAN,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "service_order_item_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quote_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_access_tokens" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quote_access_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_view_logs" (
    "id" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    CONSTRAINT "quote_view_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_order_status_history_service_order_id_idx" ON "service_order_status_history"("service_order_id");
CREATE INDEX "service_order_checklist_items_service_order_id_idx" ON "service_order_checklist_items"("service_order_id");
CREATE INDEX "attachments_organization_id_entity_type_entity_id_idx" ON "attachments"("organization_id", "entity_type", "entity_id");
CREATE INDEX "attachments_service_order_id_idx" ON "attachments"("service_order_id");
CREATE INDEX "quote_lines_quote_id_idx" ON "quote_lines"("quote_id");
CREATE UNIQUE INDEX "quote_access_tokens_token_key" ON "quote_access_tokens"("token");
CREATE UNIQUE INDEX "quotes_organization_id_number_key" ON "quotes"("organization_id", "number");

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_consultant_member_id_fkey" FOREIGN KEY ("consultant_member_id") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_mechanic_member_id_fkey" FOREIGN KEY ("mechanic_member_id") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "service_order_status_history" ADD CONSTRAINT "service_order_status_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_order_status_history" ADD CONSTRAINT "service_order_status_history_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_order_status_history" ADD CONSTRAINT "service_order_status_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "service_order_checklist_items" ADD CONSTRAINT "service_order_checklist_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_order_checklist_items" ADD CONSTRAINT "service_order_checklist_items_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attachments" ADD CONSTRAINT "attachments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quote_access_tokens" ADD CONSTRAINT "quote_access_tokens_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_access_tokens" ADD CONSTRAINT "quote_access_tokens_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quote_view_logs" ADD CONSTRAINT "quote_view_logs_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "quote_access_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
