import { useState } from "react";
import ModulePageShell from "../../components/modules/ModulePageShell";
import KpiStrip from "../../components/modules/KpiStrip";
import DataTable from "../../components/modules/DataTable";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { useApiQuery } from "../../hooks/useApiQuery";
import { inputClass } from "../../components/modules/FormDrawer";

function monthBounds() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}

type ProductivityRow = {
  employee: { id: string; name: string; jobTitle?: { name: string } | null };
  osFinished: number;
  servicesExecuted: number;
  laborValue: number;
  commissionsGenerated: number;
};

export default function ProductivityPage() {
  const bounds = monthBounds();
  const [periodStart, setPeriodStart] = useState(bounds.start);
  const [periodEnd, setPeriodEnd] = useState(bounds.end);

  const { data, isLoading, error } = useApiQuery(
    ["team-productivity", periodStart, periodEnd],
    (t) => api.teamProductivity(t, periodStart, periodEnd),
  );

  const rows = ((data ?? []) as ProductivityRow[]).map((r) => ({
    ...r,
    id: r.employee.id,
  }));
  const totals = rows.reduce(
    (acc, r) => ({
      os: acc.os + r.osFinished,
      services: acc.services + r.servicesExecuted,
      labor: acc.labor + r.laborValue,
      commissions: acc.commissions + r.commissionsGenerated,
    }),
    { os: 0, services: 0, labor: 0, commissions: 0 },
  );

  const top = [...rows].sort((a, b) => b.servicesExecuted - a.servicesExecuted)[0];

  return (
    <ModulePageShell
      title="Produtividade da Equipe"
      description="Acompanhe produção, serviços executados e comissões por funcionário."
    >
      <div className="flex gap-4 mb-4">
        <input
          type="date"
          className={inputClass}
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
        />
        <input
          type="date"
          className={inputClass}
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
        />
      </div>

      <KpiStrip
        items={[
          { label: "OS finalizadas", value: String(totals.os) },
          { label: "Serviços executados", value: String(totals.services) },
          { label: "Mão de obra gerada", value: formatMoney(totals.labor) },
          { label: "Comissões geradas", value: formatMoney(totals.commissions), tone: "success" },
          {
            label: "Mais produtivo",
            value: top?.employee.name ?? "—",
            tone: "warning",
          },
        ]}
      />

      <DataTable
        loading={isLoading}
        error={error ?? null}
        columns={[
          {
            key: "name",
            header: "Funcionário",
            render: (r: ProductivityRow) => r.employee.name,
          },
          {
            key: "cargo",
            header: "Cargo",
            render: (r: ProductivityRow) => r.employee.jobTitle?.name ?? "—",
          },
          { key: "os", header: "OS finalizadas", render: (r: ProductivityRow) => String(r.osFinished) },
          {
            key: "svc",
            header: "Serviços",
            render: (r: ProductivityRow) => String(r.servicesExecuted),
          },
          {
            key: "labor",
            header: "Mão de obra",
            render: (r: ProductivityRow) => formatMoney(r.laborValue),
          },
          {
            key: "comm",
            header: "Comissão",
            render: (r: ProductivityRow) => formatMoney(r.commissionsGenerated),
          },
        ]}
        rows={rows}
      />
    </ModulePageShell>
  );
}
