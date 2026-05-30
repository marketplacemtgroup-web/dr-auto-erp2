import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ModulePageShell from "../../components/modules/ModulePageShell";
import KpiStrip from "../../components/modules/KpiStrip";
import { api } from "../../lib/api";
import { downloadCsv } from "../../lib/csvExport";
import { formatMoney } from "../../lib/format";
import { serviceOrderStatusLabel } from "../../lib/labels";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDashboardKpis } from "../../hooks/useDashboardKpis";
import { useAuthStore } from "../../stores/authStore";

export default function ReportsPage() {
  const token = useAuthStore((s) => s.session?.accessToken ?? null);
  const { data: kpis, isLoading: kpisLoading } = useDashboardKpis();
  const { data: summary, isLoading } = useApiQuery(["reports-summary"], (t) => api.reportsSummary(t));
  const { data: bi, isLoading: biLoading } = useApiQuery(["reports-bi"], (t) => api.reportsBi(t));

  const revenueChart =
    summary?.revenueWeek.map((r) => ({
      day: new Date(r.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
      value: Number(r.amount),
    })) ?? [];

  const statusChart =
    summary?.serviceOrdersByStatus.map((r) => ({
      name: serviceOrderStatusLabel[r.status] ?? r.status,
      count: r.count,
    })) ?? [];

  const dreChart = bi?.dre.slice(-6).map((d) => ({
    month: d.month,
    receita: d.revenue,
    despesa: d.expense,
    resultado: d.result,
  })) ?? [];

  async function handleExport(type: string, filename: string) {
    if (!token) return;
    const data = await api.reportsExport(token, type);
    const flat = (data as Record<string, unknown>[]).map((row) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (v && typeof v === "object" && !Array.isArray(v)) {
          for (const [nk, nv] of Object.entries(v as Record<string, unknown>)) {
            out[`${k}_${nk}`] = nv;
          }
        } else {
          out[k] = v;
        }
      }
      return out;
    });
    downloadCsv(filename, flat);
  }

  return (
    <ModulePageShell title="Relatorios" description="Visao gerencial, BI e exportacao">
      <KpiStrip
        items={[
          { label: "Faturamento hoje", value: kpisLoading ? "—" : formatMoney(kpis?.dailyRevenue ?? 0) },
          { label: "Faturamento mes", value: isLoading ? "—" : formatMoney(summary?.monthRevenue ?? 0), tone: "success" },
          {
            label: "Conversao orcamentos",
            value: biLoading ? "—" : `${bi?.quoteConversion.rate ?? 0}%`,
            tone: "warning",
          },
          { label: "Clientes inativos (90d)", value: biLoading ? "—" : String(bi?.inactiveCustomers.length ?? 0), tone: "danger" },
          { label: "OS em andamento", value: isLoading ? "—" : String(summary?.openOrders ?? 0) },
          { label: "Pecas em falta", value: isLoading ? "—" : String(summary?.lowStockCount ?? 0), tone: (summary?.lowStockCount ?? 0) > 0 ? "danger" : "default" },
        ]}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { type: "financial", file: "financeiro.csv", label: "Exportar financeiro" },
          { type: "service-orders", file: "ordens-servico.csv", label: "Exportar OS" },
          { type: "low-stock", file: "estoque-baixo.csv", label: "Exportar estoque baixo" },
          { type: "inactive-customers", file: "clientes-inativos.csv", label: "Exportar inativos" },
        ].map((e) => (
          <button
            key={e.type}
            type="button"
            onClick={() => void handleExport(e.type, e.file)}
            className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] text-[#0E7490] hover:bg-[#F0FDFA]"
          >
            {e.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <h3 className="text-[14px] font-semibold text-[#1E293B] mb-4">Faturamento — ultimos 7 dias</h3>
          <div className="h-56">
            {revenueChart.length === 0 ? (
              <p className="text-sm text-[#94A3B8] text-center pt-16">Sem lancamentos de faturamento diario ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Bar dataKey="value" fill="#0E7490" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <h3 className="text-[14px] font-semibold text-[#1E293B] mb-4">DRE simplificado (meses)</h3>
          <div className="h-56">
            {dreChart.length === 0 ? (
              <p className="text-sm text-[#94A3B8] text-center pt-16">Sem pagamentos registrados ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dreChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Line type="monotone" dataKey="receita" stroke="#16A34A" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="despesa" stroke="#DC2626" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="resultado" stroke="#0E7490" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <h3 className="text-[14px] font-semibold text-[#1E293B] mb-4">OS por status</h3>
          <div className="h-48">
            {statusChart.length === 0 ? (
              <p className="text-sm text-[#94A3B8] text-center pt-12">Nenhuma OS cadastrada.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0F3D4C" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <h3 className="text-[14px] font-semibold text-[#1E293B] mb-4">OS por mecanico</h3>
          {biLoading ? (
            <p className="text-sm text-[#94A3B8]">Carregando...</p>
          ) : !bi?.ordersByMechanic.length ? (
            <p className="text-sm text-[#94A3B8]">Nenhuma OS com mecanico atribuido.</p>
          ) : (
            <ul className="space-y-2 text-[13px]">
              {bi.ordersByMechanic.map((m, i) => (
                <li key={i} className="flex justify-between border-b border-[#F1F5F9] pb-2">
                  <span>{m.name}</span>
                  <span className="text-[#64748B]">
                    {m.count} OS — <strong>{formatMoney(m.total)}</strong>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <h3 className="text-[14px] font-semibold text-[#1E293B] mb-3">Clientes inativos (90 dias)</h3>
          {biLoading ? (
            <p className="text-sm text-[#94A3B8]">Carregando...</p>
          ) : !bi?.inactiveCustomers.length ? (
            <p className="text-sm text-[#94A3B8]">Todos os clientes ativos tiveram movimento recente.</p>
          ) : (
            <ul className="max-h-48 overflow-y-auto space-y-2 text-[13px]">
              {bi.inactiveCustomers.slice(0, 15).map((c) => (
                <li key={c.id} className="flex justify-between text-[#64748B]">
                  <span>{c.name}</span>
                  <span>{c.phone ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <h3 className="text-[14px] font-semibold text-[#1E293B] mb-3">Financeiro em aberto</h3>
          <div className="space-y-3 text-[13px]">
            <div className="flex justify-between">
              <span className="text-[#64748B]">A receber</span>
              <span className="font-semibold text-[#16A34A]">
                {isLoading ? "—" : formatMoney(summary?.openReceivables.amount ?? 0)}
                <span className="text-[11px] font-normal text-[#94A3B8] ml-1">({summary?.openReceivables.count ?? 0})</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">A pagar</span>
              <span className="font-semibold text-[#DC2626]">
                {isLoading ? "—" : formatMoney(summary?.openPayables.amount ?? 0)}
                <span className="text-[11px] font-normal text-[#94A3B8] ml-1">({summary?.openPayables.count ?? 0})</span>
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#F1F5F9]">
              <span className="text-[#64748B]">Orcamentos convertidos</span>
              <span className="font-medium text-[#1E293B]">
                {bi?.quoteConversion.approved ?? 0} / {bi?.quoteConversion.total ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ModulePageShell>
  );
}
