/*
  Warnings:

  - Added the required column `updated_at` to the `service_order_items` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('CLT', 'AUTONOMO', 'MEI', 'TERCEIRIZADO', 'DIARISTA', 'COMISSIONADO', 'OUTRO');

-- CreateEnum
CREATE TYPE "EmployeePaymentType" AS ENUM ('FIXO', 'FIXO_MAIS_COMISSAO', 'SOMENTE_COMISSAO', 'DIARIA', 'POR_SERVICO', 'TERCEIRIZADO');

-- CreateEnum
CREATE TYPE "PaymentPeriodicity" AS ENUM ('MENSAL', 'QUINZENAL', 'SEMANAL');

-- CreateEnum
CREATE TYPE "CommissionRuleType" AS ENUM ('PERCENTUAL', 'VALOR_FIXO', 'META', 'MANUAL');

-- CreateEnum
CREATE TYPE "CommissionBase" AS ENUM ('MAO_DE_OBRA', 'PECAS', 'TOTAL_OS', 'SERVICO_ESPECIFICO', 'PRODUTO_ESPECIFICO', 'VENDA_BALCAO', 'OS_FINALIZADA');

-- CreateEnum
CREATE TYPE "CommissionTrigger" AS ENUM ('ORCAMENTO_APROVADO', 'SERVICO_FINALIZADO', 'OS_FINALIZADA', 'OS_ENTREGUE', 'PAGAMENTO_RECEBIDO');

-- CreateEnum
CREATE TYPE "GeneratedCommissionStatus" AS ENUM ('PENDENTE', 'APROVADA', 'PAGA', 'CANCELADA', 'ESTORNADA');

-- CreateEnum
CREATE TYPE "CommissionItemType" AS ENUM ('SERVICO', 'PECA', 'OS', 'MANUAL');

-- CreateEnum
CREATE TYPE "EmployeeEntryType" AS ENUM ('VALE', 'ADIANTAMENTO', 'BONUS', 'DESCONTO', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'DIARIA', 'AJUDA_CUSTO');

-- CreateEnum
CREATE TYPE "EmployeeEntryStatus" AS ENUM ('PENDENTE', 'APLICADO', 'CANCELADO', 'PAGO');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('ABERTA', 'FECHADA', 'PAGA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "PayrollItemType" AS ENUM ('SALARIO', 'COMISSAO', 'BONUS', 'VALE', 'ADIANTAMENTO', 'DESCONTO', 'AJUSTE');

-- DropIndex
DROP INDEX "customers_organization_id_deleted_at_idx";

-- DropIndex
DROP INDEX "products_organization_id_deleted_at_idx";

-- DropIndex
DROP INDEX "quotes_organization_id_deleted_at_idx";

-- DropIndex
DROP INDEX "service_orders_organization_id_deleted_at_idx";

-- DropIndex
DROP INDEX "vehicles_organization_id_deleted_at_idx";

-- AlterTable
ALTER TABLE "service_order_items" ADD COLUMN     "applied_by_id" TEXT,
ADD COLUMN     "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "executor_id" TEXT,
ADD COLUMN     "expected_commission" DECIMAL(12,2),
ADD COLUMN     "separated_by_id" TEXT,
ADD COLUMN     "sold_by_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "service_orders" ADD COLUMN     "checklist_by_id" TEXT,
ADD COLUMN     "diagnosis_by_id" TEXT,
ADD COLUMN     "execution_by_id" TEXT,
ADD COLUMN     "finalized_by_id" TEXT,
ADD COLUMN     "general_responsible_id" TEXT,
ADD COLUMN     "quote_by_id" TEXT;

-- CreateTable
CREATE TABLE "job_titles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_technical" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_titles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "member_id" TEXT,
    "job_title_id" TEXT,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "rg" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "birth_date" DATE,
    "address" TEXT,
    "employment_type" "EmploymentType" NOT NULL DEFAULT 'CLT',
    "hire_date" DATE,
    "termination_date" DATE,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "photo_url" TEXT,
    "access_profile" TEXT,
    "is_technical" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_payment_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "payment_type" "EmployeePaymentType" NOT NULL,
    "fixed_salary" DECIMAL(12,2),
    "payment_day" INTEGER,
    "periodicity" "PaymentPeriodicity" DEFAULT 'MENSAL',
    "payment_method" "PaymentMethod",
    "bank_name" TEXT,
    "pix_key" TEXT,
    "allow_bonus" BOOLEAN NOT NULL DEFAULT true,
    "allow_discount" BOOLEAN NOT NULL DEFAULT true,
    "allow_advance" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_payment_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_commission_rules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "rule_type" "CommissionRuleType" NOT NULL,
    "base_calculation" "CommissionBase" NOT NULL,
    "percentage" DECIMAL(5,2),
    "fixed_amount" DECIMAL(12,2),
    "catalog_item_id" TEXT,
    "product_id" TEXT,
    "trigger" "CommissionTrigger" NOT NULL DEFAULT 'OS_FINALIZADA',
    "consider_discount" BOOLEAN NOT NULL DEFAULT true,
    "consider_only_received" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_commissions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "service_order_id" TEXT,
    "quote_id" TEXT,
    "item_id" TEXT,
    "item_type" "CommissionItemType" NOT NULL,
    "rule_type" "CommissionRuleType",
    "description" TEXT NOT NULL,
    "base_amount" DECIMAL(12,2) NOT NULL,
    "percentage" DECIMAL(5,2),
    "fixed_amount" DECIMAL(12,2),
    "commission_amount" DECIMAL(12,2) NOT NULL,
    "status" "GeneratedCommissionStatus" NOT NULL DEFAULT 'PENDENTE',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "payroll_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_entries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "entry_type" "EmployeeEntryType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "entry_date" DATE NOT NULL,
    "competence" DATE,
    "status" "EmployeeEntryStatus" NOT NULL DEFAULT 'PENDENTE',
    "payment_method" "PaymentMethod",
    "attachment_url" TEXT,
    "notes" TEXT,
    "created_by_user_id" TEXT,
    "payroll_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payrolls" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "fixed_salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_commissions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_discounts" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_advances" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "PayrollStatus" NOT NULL DEFAULT 'ABERTA',
    "paid_at" TIMESTAMP(3),
    "payment_method" "PaymentMethod",
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" TEXT NOT NULL,
    "payroll_id" TEXT NOT NULL,
    "item_type" "PayrollItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "doc_type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_action_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "employee_id" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entity_id" TEXT,
    "description" TEXT NOT NULL,
    "ip_address" TEXT,
    "device" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_titles_organization_id_idx" ON "job_titles"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_titles_organization_id_name_key" ON "job_titles"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_member_id_key" ON "employees"("member_id");

-- CreateIndex
CREATE INDEX "employees_organization_id_status_idx" ON "employees"("organization_id", "status");

-- CreateIndex
CREATE INDEX "employees_organization_id_name_idx" ON "employees"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "employee_payment_configs_employee_id_key" ON "employee_payment_configs"("employee_id");

-- CreateIndex
CREATE INDEX "employee_payment_configs_organization_id_idx" ON "employee_payment_configs"("organization_id");

-- CreateIndex
CREATE INDEX "employee_commission_rules_organization_id_employee_id_idx" ON "employee_commission_rules"("organization_id", "employee_id");

-- CreateIndex
CREATE INDEX "employee_commission_rules_employee_id_is_active_idx" ON "employee_commission_rules"("employee_id", "is_active");

-- CreateIndex
CREATE INDEX "generated_commissions_organization_id_employee_id_status_idx" ON "generated_commissions"("organization_id", "employee_id", "status");

-- CreateIndex
CREATE INDEX "generated_commissions_service_order_id_idx" ON "generated_commissions"("service_order_id");

-- CreateIndex
CREATE INDEX "employee_entries_organization_id_employee_id_idx" ON "employee_entries"("organization_id", "employee_id");

-- CreateIndex
CREATE INDEX "employee_entries_entry_date_idx" ON "employee_entries"("entry_date");

-- CreateIndex
CREATE INDEX "payrolls_organization_id_period_start_period_end_idx" ON "payrolls"("organization_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "payrolls_employee_id_status_idx" ON "payrolls"("employee_id", "status");

-- CreateIndex
CREATE INDEX "payroll_items_payroll_id_idx" ON "payroll_items"("payroll_id");

-- CreateIndex
CREATE INDEX "employee_documents_employee_id_idx" ON "employee_documents"("employee_id");

-- CreateIndex
CREATE INDEX "team_action_logs_organization_id_created_at_idx" ON "team_action_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "team_action_logs_employee_id_idx" ON "team_action_logs"("employee_id");

-- CreateIndex
CREATE INDEX "quote_access_tokens_quote_id_idx" ON "quote_access_tokens"("quote_id");

-- CreateIndex
CREATE INDEX "quote_view_logs_token_id_idx" ON "quote_view_logs"("token_id");

-- CreateIndex
CREATE INDEX "service_order_items_executor_id_idx" ON "service_order_items"("executor_id");

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_general_responsible_id_fkey" FOREIGN KEY ("general_responsible_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_checklist_by_id_fkey" FOREIGN KEY ("checklist_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_diagnosis_by_id_fkey" FOREIGN KEY ("diagnosis_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_quote_by_id_fkey" FOREIGN KEY ("quote_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_execution_by_id_fkey" FOREIGN KEY ("execution_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_finalized_by_id_fkey" FOREIGN KEY ("finalized_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_executor_id_fkey" FOREIGN KEY ("executor_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_sold_by_id_fkey" FOREIGN KEY ("sold_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_applied_by_id_fkey" FOREIGN KEY ("applied_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_separated_by_id_fkey" FOREIGN KEY ("separated_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_titles" ADD CONSTRAINT "job_titles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_job_title_id_fkey" FOREIGN KEY ("job_title_id") REFERENCES "job_titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payment_configs" ADD CONSTRAINT "employee_payment_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payment_configs" ADD CONSTRAINT "employee_payment_configs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_commission_rules" ADD CONSTRAINT "employee_commission_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_commission_rules" ADD CONSTRAINT "employee_commission_rules_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_commission_rules" ADD CONSTRAINT "employee_commission_rules_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "service_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_commission_rules" ADD CONSTRAINT "employee_commission_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_commissions" ADD CONSTRAINT "generated_commissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_commissions" ADD CONSTRAINT "generated_commissions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_commissions" ADD CONSTRAINT "generated_commissions_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_commissions" ADD CONSTRAINT "generated_commissions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_commissions" ADD CONSTRAINT "generated_commissions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "service_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_commissions" ADD CONSTRAINT "generated_commissions_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_entries" ADD CONSTRAINT "employee_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_entries" ADD CONSTRAINT "employee_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_entries" ADD CONSTRAINT "employee_entries_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_action_logs" ADD CONSTRAINT "team_action_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_action_logs" ADD CONSTRAINT "team_action_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
