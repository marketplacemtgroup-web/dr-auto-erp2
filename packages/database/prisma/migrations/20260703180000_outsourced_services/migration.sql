-- Serviços terceirizados: catálogo de serviços feitos por terceiros
-- (alinhamento, balanceamento, retífica, etc.) com custo e preço de venda.
CREATE TABLE "outsourced_services" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "category" TEXT,
    "cost_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sale_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outsourced_services_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outsourced_services_organization_id_is_active_idx" ON "outsourced_services"("organization_id", "is_active");

ALTER TABLE "outsourced_services" ADD CONSTRAINT "outsourced_services_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vínculo opcional do item da OS com o serviço terceirizado do catálogo.
ALTER TABLE "service_order_items" ADD COLUMN "outsourced_service_id" TEXT;

ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_outsourced_service_id_fkey" FOREIGN KEY ("outsourced_service_id") REFERENCES "outsourced_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
