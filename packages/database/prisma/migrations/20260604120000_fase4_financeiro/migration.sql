-- Fase 4: financeiro avançado + caixa

CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'PIX', 'CARD', 'BOLETO', 'TRANSFER', 'OTHER');
CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "CashMovementType" AS ENUM ('SUPPLY', 'WITHDRAWAL', 'PAYMENT_IN', 'PAYMENT_OUT');

ALTER TABLE "financial_entries" ADD COLUMN "customer_id" TEXT;
ALTER TABLE "financial_entries" ADD COLUMN "service_order_id" TEXT;
ALTER TABLE "financial_entries" ADD COLUMN "quote_id" TEXT;
ALTER TABLE "financial_entries" ADD COLUMN "parent_entry_id" TEXT;
ALTER TABLE "financial_entries" ADD COLUMN "payment_method" "PaymentMethod";
ALTER TABLE "financial_entries" ADD COLUMN "paid_at" TIMESTAMP(3);
ALTER TABLE "financial_entries" ADD COLUMN "installment_number" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "financial_entries" ADD COLUMN "installment_total" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_parent_entry_id_fkey" FOREIGN KEY ("parent_entry_id") REFERENCES "financial_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "financial_entries_customer_id_idx" ON "financial_entries"("customer_id");
CREATE INDEX "financial_entries_service_order_id_idx" ON "financial_entries"("service_order_id");

CREATE TABLE "cash_register_sessions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "opened_by_user_id" TEXT NOT NULL,
    "closed_by_user_id" TEXT,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "opening_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "closing_balance" DECIMAL(12,2),
    "expected_balance" DECIMAL(12,2),
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_register_sessions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "cash_register_sessions" ADD CONSTRAINT "cash_register_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_register_sessions" ADD CONSTRAINT "cash_register_sessions_opened_by_user_id_fkey" FOREIGN KEY ("opened_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_register_sessions" ADD CONSTRAINT "cash_register_sessions_closed_by_user_id_fkey" FOREIGN KEY ("closed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "cash_register_sessions_organization_id_status_idx" ON "cash_register_sessions"("organization_id", "status");

CREATE TABLE "cash_register_movements" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "financial_entry_id" TEXT,
    "movement_type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_register_movements_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "cash_register_movements" ADD CONSTRAINT "cash_register_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_register_movements" ADD CONSTRAINT "cash_register_movements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "cash_register_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_register_movements" ADD CONSTRAINT "cash_register_movements_financial_entry_id_fkey" FOREIGN KEY ("financial_entry_id") REFERENCES "financial_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "cash_register_movements_session_id_idx" ON "cash_register_movements"("session_id");
