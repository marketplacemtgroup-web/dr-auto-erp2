-- Desconto e pagamento dividido em recebimentos

ALTER TABLE "financial_entries" ADD COLUMN "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "financial_entries" ADD COLUMN "discount_percent" DECIMAL(5,2);
ALTER TABLE "financial_entries" ADD COLUMN "amount_received" DECIMAL(12,2);

CREATE TABLE "financial_payment_splits" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "financial_entry_id" TEXT NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_payment_splits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "financial_payment_splits_financial_entry_id_idx" ON "financial_payment_splits"("financial_entry_id");

ALTER TABLE "financial_payment_splits" ADD CONSTRAINT "financial_payment_splits_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_payment_splits" ADD CONSTRAINT "financial_payment_splits_financial_entry_id_fkey" FOREIGN KEY ("financial_entry_id") REFERENCES "financial_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
