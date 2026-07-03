-- Despesas fixas: modelos reutilizáveis (nome + valor + cor) para gerar
-- lançamentos de contas a pagar recorrentes de forma padronizada.
CREATE TABLE "fixed_expenses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#DC2626',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_expenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fixed_expenses_organization_id_idx" ON "fixed_expenses"("organization_id");

ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
