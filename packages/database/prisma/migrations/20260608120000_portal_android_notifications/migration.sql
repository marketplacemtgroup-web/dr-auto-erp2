-- Portal notifications inbox + FCM tokens for Android app

CREATE TABLE IF NOT EXISTS "portal_notifications" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "vehicle_id" TEXT NOT NULL,
  "service_order_id" TEXT,
  "quote_id" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "portal_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "portal_notifications_vehicle_id_read_at_created_at_idx"
  ON "portal_notifications"("vehicle_id", "read_at", "created_at");

ALTER TABLE "portal_notifications"
  ADD CONSTRAINT "portal_notifications_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "portal_notifications"
  ADD CONSTRAINT "portal_notifications_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "portal_notifications"
  ADD CONSTRAINT "portal_notifications_vehicle_id_fkey"
  FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "fcm_tokens" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "vehicle_id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT 'android',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fcm_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "fcm_tokens_token_key" ON "fcm_tokens"("token");
CREATE INDEX IF NOT EXISTS "fcm_tokens_vehicle_id_idx" ON "fcm_tokens"("vehicle_id");

ALTER TABLE "fcm_tokens"
  ADD CONSTRAINT "fcm_tokens_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fcm_tokens"
  ADD CONSTRAINT "fcm_tokens_vehicle_id_fkey"
  FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
