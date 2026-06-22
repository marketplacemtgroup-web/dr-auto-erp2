-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('STAFF', 'PORTAL');

-- CreateEnum
CREATE TYPE "MaintenanceReminderType" AS ENUM ('REVISION', 'OIL_CHANGE');

-- CreateEnum
CREATE TYPE "MaintenanceReminderStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DISMISSED');

-- AlterTable appointments
ALTER TABLE "appointments" ADD COLUMN "source" "AppointmentSource" NOT NULL DEFAULT 'STAFF';
ALTER TABLE "appointments" ADD COLUMN "requested_notes" TEXT;

-- AlterTable service_orders
ALTER TABLE "service_orders" ADD COLUMN "revision_interval_km" INTEGER;
ALTER TABLE "service_orders" ADD COLUMN "revision_interval_months" INTEGER;
ALTER TABLE "service_orders" ADD COLUMN "oil_change_interval_km" INTEGER;
ALTER TABLE "service_orders" ADD COLUMN "oil_change_interval_months" INTEGER;

-- CreateTable maintenance_reminders
CREATE TABLE "maintenance_reminders" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "type" "MaintenanceReminderType" NOT NULL,
    "interval_km" INTEGER,
    "interval_months" INTEGER,
    "baseline_km" INTEGER NOT NULL,
    "baseline_date" TIMESTAMP(3) NOT NULL,
    "due_km" INTEGER,
    "due_date" TIMESTAMP(3),
    "status" "MaintenanceReminderStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_notified_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_reminders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "maintenance_reminders_organization_id_status_idx" ON "maintenance_reminders"("organization_id", "status");
CREATE INDEX "maintenance_reminders_vehicle_id_idx" ON "maintenance_reminders"("vehicle_id");
CREATE INDEX "maintenance_reminders_service_order_id_idx" ON "maintenance_reminders"("service_order_id");

ALTER TABLE "maintenance_reminders" ADD CONSTRAINT "maintenance_reminders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_reminders" ADD CONSTRAINT "maintenance_reminders_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_reminders" ADD CONSTRAINT "maintenance_reminders_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
