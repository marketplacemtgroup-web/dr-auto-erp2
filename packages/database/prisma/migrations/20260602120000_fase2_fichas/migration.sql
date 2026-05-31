-- Fase 2: ficha cliente + veículo

CREATE TYPE "CustomerType" AS ENUM ('PF', 'PJ');
CREATE TYPE "VehicleKind" AS ENUM ('CAR', 'MOTORCYCLE', 'TRUCK', 'OTHER');

ALTER TABLE "customers" ADD COLUMN "customer_type" "CustomerType" NOT NULL DEFAULT 'PF';
ALTER TABLE "customers" ADD COLUMN "street" TEXT;
ALTER TABLE "customers" ADD COLUMN "address_number" TEXT;
ALTER TABLE "customers" ADD COLUMN "complement" TEXT;
ALTER TABLE "customers" ADD COLUMN "district" TEXT;
ALTER TABLE "customers" ADD COLUMN "city" TEXT;
ALTER TABLE "customers" ADD COLUMN "state" TEXT;
ALTER TABLE "customers" ADD COLUMN "zip_code" TEXT;
ALTER TABLE "customers" ADD COLUMN "origin" TEXT;
ALTER TABLE "customers" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "customers" ADD COLUMN "is_vip" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN "is_blocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN "is_delinquent" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "customer_contacts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "customer_contacts_customer_id_idx" ON "customer_contacts"("customer_id");

ALTER TABLE "vehicles" ADD COLUMN "vehicle_kind" "VehicleKind" NOT NULL DEFAULT 'CAR';
ALTER TABLE "vehicles" ADD COLUMN "chassis" TEXT;
ALTER TABLE "vehicles" ADD COLUMN "renavam" TEXT;
ALTER TABLE "vehicles" ADD COLUMN "fuel_type" TEXT;
ALTER TABLE "vehicles" ADD COLUMN "current_km" INTEGER;
ALTER TABLE "vehicles" ADD COLUMN "notes" TEXT;
