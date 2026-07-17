ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "free_text_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "free_text_content" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "free_text_amount" DECIMAL(12,2);
