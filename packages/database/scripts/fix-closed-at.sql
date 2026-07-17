-- Fix missing closed_at (migration marked applied but column absent)
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMP(3);

UPDATE "service_orders" so
SET "closed_at" = sub.first_closed
FROM (
  SELECT "service_order_id", MIN("created_at") AS first_closed
  FROM "service_order_status_history"
  WHERE "to_status" IN ('FINISHED', 'DELIVERED', 'AWAITING_PAYMENT')
  GROUP BY "service_order_id"
) sub
WHERE so."id" = sub."service_order_id"
  AND so."closed_at" IS NULL;

UPDATE "service_orders"
SET "closed_at" = "updated_at"
WHERE "closed_at" IS NULL
  AND "status" IN ('FINISHED', 'DELIVERED', 'AWAITING_PAYMENT');
