-- Lembrete de pagamento combinado com o cliente (orçamento e OS)
ALTER TABLE "service_orders" ADD COLUMN "payment_agreement" TEXT;
ALTER TABLE "quotes" ADD COLUMN "payment_agreement" TEXT;
