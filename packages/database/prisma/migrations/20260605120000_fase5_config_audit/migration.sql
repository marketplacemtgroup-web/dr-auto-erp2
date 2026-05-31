-- Fase 5: configurações da oficina, soft delete e auditoria

ALTER TABLE "organizations" ADD COLUMN "logo_url" TEXT;
ALTER TABLE "organizations" ADD COLUMN "primary_color" TEXT NOT NULL DEFAULT '#0E7490';
ALTER TABLE "organizations" ADD COLUMN "accent_color" TEXT NOT NULL DEFAULT '#0F3D4C';
ALTER TABLE "organizations" ADD COLUMN "footer_text" TEXT;
ALTER TABLE "organizations" ADD COLUMN "terms_service_order" TEXT;
ALTER TABLE "organizations" ADD COLUMN "terms_quote" TEXT;
ALTER TABLE "organizations" ADD COLUMN "portal_welcome" TEXT;

ALTER TABLE "customers" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "vehicles" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "service_orders" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "quotes" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "products" ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "customers_organization_id_deleted_at_idx" ON "customers"("organization_id", "deleted_at");
CREATE INDEX "vehicles_organization_id_deleted_at_idx" ON "vehicles"("organization_id", "deleted_at");
CREATE INDEX "service_orders_organization_id_deleted_at_idx" ON "service_orders"("organization_id", "deleted_at");
CREATE INDEX "quotes_organization_id_deleted_at_idx" ON "quotes"("organization_id", "deleted_at");
CREATE INDEX "products_organization_id_deleted_at_idx" ON "products"("organization_id", "deleted_at");
