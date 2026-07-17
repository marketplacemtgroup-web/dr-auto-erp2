-- AlterTable
ALTER TABLE "quotes" ADD COLUMN "summary_mode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "quotes" ADD COLUMN "summary_text" TEXT;
ALTER TABLE "quotes" ADD COLUMN "summary_amount" DECIMAL(12,2);
