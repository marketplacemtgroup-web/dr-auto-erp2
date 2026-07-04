-- AlterTable
ALTER TABLE "service_orders" ADD COLUMN "attachments_purge_at" TIMESTAMP(3),
ADD COLUMN "attachments_purged_at" TIMESTAMP(3);
