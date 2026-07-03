-- Data de fechamento estável da OS: reconhecimento de lucro por competência,
-- independente de edições futuras (antes usávamos updated_at, que se movia).
ALTER TABLE "service_orders" ADD COLUMN "closed_at" TIMESTAMP(3);

-- Backfill: primeira vez em que a OS entrou em um status reconhecido (histórico).
UPDATE "service_orders" so
SET "closed_at" = sub.first_closed
FROM (
  SELECT "service_order_id", MIN("created_at") AS first_closed
  FROM "service_order_status_history"
  WHERE "to_status" IN ('FINISHED', 'DELIVERED', 'AWAITING_PAYMENT')
  GROUP BY "service_order_id"
) sub
WHERE so."id" = sub."service_order_id";

-- Fallback: OS já reconhecidas sem histórico usam a última atualização.
UPDATE "service_orders"
SET "closed_at" = "updated_at"
WHERE "closed_at" IS NULL
  AND "status" IN ('FINISHED', 'DELIVERED', 'AWAITING_PAYMENT');
