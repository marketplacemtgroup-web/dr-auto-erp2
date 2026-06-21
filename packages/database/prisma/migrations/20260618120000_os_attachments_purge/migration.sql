-- AlterTable (idempotente: colunas podem já existir em bancos sincronizados manualmente)
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "attachments_purge_at" TIMESTAMP(3);
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "attachments_purged_at" TIMESTAMP(3);
