-- CreateEnum
CREATE TYPE "ScheduleDayType" AS ENUM ('TRABALHO', 'FOLGA', 'PLANTAO', 'FERIADO', 'COMPENSACAO', 'AFASTADO', 'TREINAMENTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PLANEJADA', 'CONFIRMADA', 'ALTERADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TimeClockEntryType" AS ENUM ('ENTRADA', 'INTERVALO_INICIO', 'INTERVALO_FIM', 'SAIDA');

-- CreateEnum
CREATE TYPE "TimeClockStatus" AS ENUM ('VALIDO', 'PENDENTE', 'AJUSTADO', 'RECUSADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TimeClockOrigin" AS ENUM ('WEB', 'APP_COLABORADOR', 'APP_INTERNO', 'MANUAL_ADMIN');

-- CreateEnum
CREATE TYPE "EmployeeRequestType" AS ENUM ('AJUSTE_PONTO', 'JUSTIFICATIVA_ATRASO', 'JUSTIFICATIVA_FALTA', 'FOLGA', 'TROCA_ESCALA', 'OBSERVACAO_GERENTE');

-- CreateEnum
CREATE TYPE "EmployeeRequestStatus" AS ENUM ('ENVIADA', 'EM_ANALISE', 'APROVADA', 'RECUSADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "employee_schedule_recurrences" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "name" TEXT,
    "days_of_week" INTEGER[],
    "day_type" "ScheduleDayType" NOT NULL DEFAULT 'TRABALHO',
    "start_time" TEXT,
    "end_time" TEXT,
    "break_start" TEXT,
    "break_end" TEXT,
    "period_start" DATE NOT NULL,
    "period_end" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_schedule_recurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_schedules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "schedule_date" DATE NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "day_type" "ScheduleDayType" NOT NULL DEFAULT 'TRABALHO',
    "start_time" TEXT,
    "end_time" TEXT,
    "break_start" TEXT,
    "break_end" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_id" TEXT,
    "is_exception" BOOLEAN NOT NULL DEFAULT false,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PLANEJADA',
    "notes" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_schedule_histories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "changed_by_id" TEXT,
    "action" TEXT NOT NULL,
    "previous_data" JSONB,
    "new_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_schedule_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_time_clock_entries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "user_id" TEXT,
    "entry_date" DATE NOT NULL,
    "entry_type" "TimeClockEntryType" NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "origin" "TimeClockOrigin" NOT NULL DEFAULT 'WEB',
    "status" "TimeClockStatus" NOT NULL DEFAULT 'VALIDO',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "address_approx" TEXT,
    "device" TEXT,
    "ip_address" TEXT,
    "selfie_url" TEXT,
    "notes" TEXT,
    "adjusted_by_id" TEXT,
    "adjusted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_time_clock_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_time_clock_days" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "work_date" DATE NOT NULL,
    "schedule_id" TEXT,
    "clock_in" TIMESTAMP(3),
    "break_start" TIMESTAMP(3),
    "break_end" TIMESTAMP(3),
    "clock_out" TIMESTAMP(3),
    "worked_minutes" INTEGER NOT NULL DEFAULT 0,
    "expected_minutes" INTEGER NOT NULL DEFAULT 0,
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_leave_minutes" INTEGER NOT NULL DEFAULT 0,
    "status" "TimeClockStatus" NOT NULL DEFAULT 'PENDENTE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_time_clock_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "request_type" "EmployeeRequestType" NOT NULL,
    "reference_date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "attachment_url" TEXT,
    "status" "EmployeeRequestStatus" NOT NULL DEFAULT 'ENVIADA',
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_schedule_recurrences_organization_id_employee_id_idx" ON "employee_schedule_recurrences"("organization_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_schedules_employee_id_schedule_date_key" ON "employee_schedules"("employee_id", "schedule_date");

-- CreateIndex
CREATE INDEX "employee_schedules_organization_id_schedule_date_idx" ON "employee_schedules"("organization_id", "schedule_date");

-- CreateIndex
CREATE INDEX "employee_schedules_organization_id_employee_id_schedule_date_idx" ON "employee_schedules"("organization_id", "employee_id", "schedule_date");

-- CreateIndex
CREATE INDEX "employee_schedule_histories_schedule_id_idx" ON "employee_schedule_histories"("schedule_id");

-- CreateIndex
CREATE INDEX "employee_schedule_histories_organization_id_created_at_idx" ON "employee_schedule_histories"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "employee_time_clock_entries_organization_id_entry_date_idx" ON "employee_time_clock_entries"("organization_id", "entry_date");

-- CreateIndex
CREATE INDEX "employee_time_clock_entries_organization_id_employee_id_entry_date_idx" ON "employee_time_clock_entries"("organization_id", "employee_id", "entry_date");

-- CreateIndex
CREATE UNIQUE INDEX "employee_time_clock_days_employee_id_work_date_key" ON "employee_time_clock_days"("employee_id", "work_date");

-- CreateIndex
CREATE INDEX "employee_time_clock_days_organization_id_work_date_idx" ON "employee_time_clock_days"("organization_id", "work_date");

-- CreateIndex
CREATE INDEX "employee_requests_organization_id_status_idx" ON "employee_requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "employee_requests_organization_id_employee_id_idx" ON "employee_requests"("organization_id", "employee_id");

-- CreateIndex
CREATE INDEX "employee_requests_reference_date_idx" ON "employee_requests"("reference_date");

-- AddForeignKey
ALTER TABLE "employee_schedule_recurrences" ADD CONSTRAINT "employee_schedule_recurrences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_schedule_recurrences" ADD CONSTRAINT "employee_schedule_recurrences_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_schedules" ADD CONSTRAINT "employee_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_schedules" ADD CONSTRAINT "employee_schedules_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_schedules" ADD CONSTRAINT "employee_schedules_recurrence_id_fkey" FOREIGN KEY ("recurrence_id") REFERENCES "employee_schedule_recurrences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_schedule_histories" ADD CONSTRAINT "employee_schedule_histories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_schedule_histories" ADD CONSTRAINT "employee_schedule_histories_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "employee_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_schedule_histories" ADD CONSTRAINT "employee_schedule_histories_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_time_clock_entries" ADD CONSTRAINT "employee_time_clock_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_time_clock_entries" ADD CONSTRAINT "employee_time_clock_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_time_clock_days" ADD CONSTRAINT "employee_time_clock_days_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_time_clock_days" ADD CONSTRAINT "employee_time_clock_days_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_time_clock_days" ADD CONSTRAINT "employee_time_clock_days_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "employee_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_requests" ADD CONSTRAINT "employee_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_requests" ADD CONSTRAINT "employee_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
