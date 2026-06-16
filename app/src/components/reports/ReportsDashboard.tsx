import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PaymentMethod, ReportsFull } from "../../lib/api";
import { formatMoney, formatNegativeMoney } from "../../lib/format";
import {
  buildReportFinancialKpiItems,
  buildReportOperationsKpiItems,
} from "../../lib/reportFinancialKpis";
import { PAYMENT_LABELS } from "../../lib/paymentMethods";
import { parseLocalIsoDate, type ReportPeriodState } from "../../lib/reportPeriod";
import { serviceOrderStatusLabel } from "../../lib/labels";
import ReportSection from "./ReportSection";
import ReportKpiGrid from "./ReportKpiGrid";
import ReportGoalCard from "./ReportGoalCard";
import ReportsDrillBanner, { type ReportDrill } from "./ReportsDrillBanner";
import ReportAreaChart from "./charts/ReportAreaChart";
import ReportWaterfallChart from "./charts/ReportWaterfallChart";
import ReportHeatmapChart from "./charts/ReportHeatmapChart";
import ReportInteractivePie from "./charts/ReportInteractivePie";
import ReportCashFlowChart from "./charts/ReportCashFlowChart";
import ReportFunnelChart from "./charts/ReportFunnelChart";
import ReportHorizontalBars from "./charts/ReportHorizontalBars";

type Props = {
  report: ReportsFull;
  period: ReportPeriodState;
  token: string | null;
  isLoading: boolean;
};

const TABS = [
  { id: "overview", label: "Visão geral" },
  { id: "financial", label: "Financeiro" },
  { id: "operations", label: "Oficina" },
  { id: "commercial", label: "Comercial" },
  { id: "inventory", label: "Estoque" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function RankList({
  rows,
  empty = "Sem dados no periodo.",
}: {
  rows?: Array<{ key: string; label: string; value: string }>;
  empty?: string;
}) {
  if (!rows?.length) {
    return <p className="text-sm text-[#94A3B8]">{empty}</p>;
  }
  return (
    <ul className="max-h-52 overflow-y-auto space-y-2 text-[13px]">
      {rows.map((row) => (
        <li key={row.key} className="flex justify-between gap-2 border-b border-[#F1F5F9] pb-2">
          <span className="truncate text-[#1E293B]">{row.label}</span>
          <span className="text-[#64748B] shrink-0">{row.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ReportsDashboard({ report, period, token, isLoading }: Props) {
  const [tab, setTab] = useState<TabId>("overview");
  const [drill, setDrill] = useState<ReportDrill>(null);

  const cmp = report.comparison;

  const revenueChart = useMemo(
    () =>
      report.financial.revenueByDay.map((r) => {
        const date =
          typeof r.date === "string"
            ? parseLocalIsoDate(r.date.slice(0, 10))
            : parseLocalIsoDate(new Date(r.date).toISOString().slice(0, 10));
        return {
          label: date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
          value: Number(r.amount),
        };
      }),
    [report],
  );

  const paymentChart = report.financial.paymentMethods.map((p) => ({
    name: PAYMENT_LABELS[p.method as PaymentMethod] ?? p.method,
    value: p.amount,
    key: p.method,
  }));

  const statusChart = report.operations.ordersByStatus.map((r) => ({
    name: serviceOrderStatusLabel[r.status] ?? r.status,
    status: r.status,
    count: r.count,
  }));

  const dreChart = report.financial.dreByMonth.slice(-6);
  const funnel = report.commercial.quoteFunnel;

  const filteredReceipts =
    drill?.kind === "payment"
      ? report.financial.paymentReceipts.filter((r) => r.paymentMethod === drill.method)
      : report.financial.paymentReceipts;

  const filteredDelayed =
    drill?.kind === "status"
      ? report.operations.delayedOrders.filter((o) => o.status === drill.status)
      : report.operations.delayedOrders;

  const kpiItems = [
    ...buildReportFinancialKpiItems(report.financial, { isLoading, compare: cmp }),
    ...buildReportOperationsKpiItems(report.financial, report.operations, report.commercial, {
      isLoading,
      compare: cmp,
    }),
  ];

  const expenses = report.financial.expenses ?? report.financial.expense ?? 0;
  const grossProfit = report.financial.grossProfit ?? report.financial.partsProfit + report.financial.servicesProfit;

  return (
    <div id="reports-bi-dashboard" className="reports-bi-dashboard">
      <ReportsDrillBanner drill={drill} onClear={() => setDrill(null)} />

      <div className="flex flex-wrap gap-1 mb-4 p-1 bg-[#F1F5F9] rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`h-9 px-4 rounded-lg text-[12px] font-medium transition-colors ${
              tab === t.id
                ? "bg-white text-[#0E7490] shadow-sm"
                : "text-[#64748B] hover:text-[#1E293B]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ReportKpiGrid items={kpiItems} />

      {tab === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <ReportSection
            title="Faturamento"
            subtitle="Evolução diária no período"
            className="xl:col-span-8"
            period={period}
            token={token}
          >
            <div className="h-[280px]">
              <ReportAreaChart data={revenueChart} />
            </div>
          </ReportSection>
          <ReportSection
            title="Resultado"
            subtitle="Receita, despesas pagas e saldo"
            className="xl:col-span-4"
            period={period}
            token={token}
            exportType="financial"
            exportFile="dre.csv"
          >
            <div className="h-[280px]">
            <ReportWaterfallChart
              revenue={report.financial.revenue}
              expense={report.financial.expense}
              result={report.financial.result}
            />
            </div>
          </ReportSection>
          <ReportSection
            title="Lucro do periodo"
            subtitle="Pecas + servicos − despesas pagas"
            className="xl:col-span-12"
            period={period}
            token={token}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-[240px]">
                <ReportWaterfallChart
                  revenue={grossProfit}
                  expense={expenses}
                  result={report.financial.totalProfit}
                  labels={{
                    revenue: "Lucro bruto",
                    expense: "Despesas",
                    result: "Lucro total",
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-[13px] content-center">
                <div className="rounded-xl border border-[#E2E8F0] p-4">
                  <p className="text-[#64748B]">Lucro pecas</p>
                  <p className="text-lg font-bold text-[#1E293B]">{formatMoney(report.financial.partsProfit)}</p>
                </div>
                <div className="rounded-xl border border-[#E2E8F0] p-4">
                  <p className="text-[#64748B]">Lucro servicos</p>
                  <p className="text-lg font-bold text-[#1E293B]">{formatMoney(report.financial.servicesProfit)}</p>
                </div>
                <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
                  <p className="text-[#991B1B]">Despesas pagas</p>
                  <p className="text-lg font-bold text-[#DC2626]">{formatNegativeMoney(expenses)}</p>
                </div>
                <div className="rounded-xl border border-[#E2E8F0] p-4">
                  <p className="text-[#64748B]">Lucro total</p>
                  <p className={`text-lg font-bold ${report.financial.totalProfit >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                    {formatMoney(report.financial.totalProfit)}
                  </p>
                </div>
              </div>
            </div>
          </ReportSection>
          <ReportSection
            title="Mapa de calor — OS abertas"
            subtitle="Dia da semana × horário"
            className="xl:col-span-12"
            period={period}
            token={token}
            exportType="service-orders"
            exportFile="ordens-servico.csv"
          >
            <ReportHeatmapChart cells={report.operations.ordersHeatmap} />
          </ReportSection>
          <ReportSection title="Meta do mês" className="xl:col-span-4 min-h-[200px]" period={period} token={token}>
            <ReportGoalCard currentRevenue={report.financial.revenue} />
          </ReportSection>
          <ReportSection
            title="Formas de pagamento"
            className="xl:col-span-4"
            period={period}
            token={token}
            exportType="payment-methods"
            exportFile="formas-pagamento.csv"
          >
            <ReportInteractivePie
              data={paymentChart}
              selectedKey={drill?.kind === "payment" ? drill.method : null}
              onSelect={(key) =>
                setDrill(key ? { kind: "payment", method: key as PaymentMethod } : null)
              }
            />
          </ReportSection>
          <ReportSection
            title="Funil de orcamentos"
            className="xl:col-span-4"
            period={period}
            token={token}
            exportType="quote-funnel"
            exportFile="funil-orcamentos.csv"
          >
            <ReportFunnelChart
              draft={funnel.DRAFT}
              pending={funnel.PENDING}
              approved={funnel.APPROVED}
              rejected={funnel.REJECTED}
            />
          </ReportSection>
          {drill?.kind === "payment" && (
            <ReportSection
              title={`Recebimentos — ${PAYMENT_LABELS[drill.method]}`}
              className="xl:col-span-12"
              period={period}
              token={token}
            >
              <RankList
                rows={filteredReceipts.slice(0, 20).map((r, i) => ({
                  key: String(i),
                  label: r.customerName ?? r.description,
                  value: formatMoney(r.amount),
                }))}
                empty="Nenhum recebimento nesta forma."
              />
            </ReportSection>
          )}
        </div>
      )}

      {tab === "financial" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReportSection title="Resumo de lucro" className="lg:col-span-2" period={period} token={token}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[13px]">
              <div className="rounded-xl border border-[#E2E8F0] p-4">
                <p className="text-[#64748B]">Faturamento</p>
                <p className="text-lg font-bold text-[#16A34A]">{formatMoney(report.financial.revenue)}</p>
              </div>
              <div className="rounded-xl border border-[#E2E8F0] p-4">
                <p className="text-[#64748B]">Lucro pecas</p>
                <p className="text-lg font-bold">{formatMoney(report.financial.partsProfit)}</p>
              </div>
              <div className="rounded-xl border border-[#E2E8F0] p-4">
                <p className="text-[#64748B]">Lucro servicos</p>
                <p className="text-lg font-bold">{formatMoney(report.financial.servicesProfit)}</p>
              </div>
              <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
                <p className="text-[#991B1B]">Despesas pagas</p>
                <p className="text-lg font-bold text-[#DC2626]">{formatNegativeMoney(expenses)}</p>
              </div>
              <div className="rounded-xl border border-[#E2E8F0] p-4">
                <p className="text-[#64748B]">Lucro total</p>
                <p className={`text-lg font-bold ${report.financial.totalProfit >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                  {formatMoney(report.financial.totalProfit)}
                </p>
              </div>
            </div>
          </ReportSection>
          <ReportSection title="DRE mensal" className="lg:col-span-2" period={period} token={token}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dreChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatMoney(v)} width={72} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Line type="monotone" dataKey="revenue" stroke="#16A34A" strokeWidth={2} dot={false} name="Receita" />
                  <Line type="monotone" dataKey="expense" stroke="#DC2626" strokeWidth={2} dot={false} name="Despesa" />
                  <Line type="monotone" dataKey="result" stroke="#0E7490" strokeWidth={2} dot={false} name="Resultado" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ReportSection>
          <ReportSection title="Lucro pecas x servicos" period={period} token={token} exportType="profit-margin" exportFile="margem-por-os.csv">
            <ReportInteractivePie
              data={[
                { name: "Pecas", value: report.financial.partsProfit, key: "parts" },
                { name: "Servicos", value: report.financial.servicesProfit, key: "services" },
              ].filter((r) => r.value > 0)}
            />
            <div className="mt-3 space-y-1 text-[12px] text-[#64748B] text-center">
              <p>Lucro bruto: <span className="font-semibold text-[#1E293B]">{formatMoney(grossProfit)}</span></p>
              <p>Despesas: <span className="font-semibold text-[#DC2626]">{formatNegativeMoney(expenses)}</span></p>
              <p className="text-[14px] font-bold text-[#16A34A] pt-1">
                Lucro total: {formatMoney(report.financial.totalProfit)}
              </p>
            </div>
          </ReportSection>
          <ReportSection title="Fluxo de caixa" period={period} token={token} exportType="cash-flow" exportFile="fluxo-caixa.csv">
            <ReportCashFlowChart {...report.financial.cashFlow} />
          </ReportSection>
          <ReportSection title="Recebiveis vencidos" className="lg:col-span-2" period={period} token={token} exportType="overdue-receivables" exportFile="recebiveis-vencidos.csv">
            <RankList
              rows={report.financial.overdueReceivables.map((r) => ({
                key: r.id,
                label: `${r.customerName ?? r.description}${r.serviceOrderNumber ? ` · OS #${r.serviceOrderNumber}` : ""}`,
                value: formatMoney(r.amount),
              }))}
              empty="Nenhum vencido."
            />
          </ReportSection>
        </div>
      )}

      {tab === "operations" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReportSection title="OS por status" subtitle="Clique para filtrar atrasadas" period={period} token={token}>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                    onClick={(row) => {
                      const payload = (row as { payload?: { status?: string } })?.payload;
                      const status = payload?.status ?? (row as { status?: string }).status;
                      if (!status) return;
                      setDrill((d) =>
                        d?.kind === "status" && d.status === status
                          ? null
                          : { kind: "status", status },
                      );
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {statusChart.map((row) => (
                      <Cell
                        key={row.status}
                        fill={drill?.kind === "status" && drill.status === row.status ? "#0E7490" : "#0F3D4C"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ReportSection>
          <ReportSection title="Mecanicos" period={period} token={token} exportType="mechanic-productivity" exportFile="produtividade-mecanicos.csv">
            <ReportHorizontalBars
              data={report.operations.ordersByMechanic.map((m) => ({ label: m.name, value: m.total }))}
              formatValue={formatMoney}
              color="#0F3D4C"
            />
          </ReportSection>
          <ReportSection title="OS atrasadas" className="lg:col-span-2" period={period} token={token} exportType="delayed-orders" exportFile="os-atrasadas.csv">
            <RankList
              rows={filteredDelayed.map((o) => ({
                key: o.id,
                label: `OS #${o.number} — ${o.customerName}`,
                value: o.estimatedAt ? new Date(o.estimatedAt).toLocaleDateString("pt-BR") : "—",
              }))}
              empty="Nenhuma atrasada."
            />
          </ReportSection>
          <ReportSection title="Servicos" period={period} token={token} exportType="top-services" exportFile="servicos-mais-vendidos.csv">
            <ReportHorizontalBars
              data={report.operations.topServices.map((s) => ({ label: s.description, value: s.revenue }))}
              formatValue={formatMoney}
              color="#3B82F6"
            />
          </ReportSection>
          <ReportSection title="Pecas" period={period} token={token} exportType="top-parts" exportFile="pecas-mais-usadas.csv">
            <ReportHorizontalBars
              data={report.operations.topParts.map((p) => ({ label: p.description, value: p.profit }))}
              formatValue={formatMoney}
              color="#F97316"
            />
          </ReportSection>
        </div>
      )}

      {tab === "commercial" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReportSection title="Top clientes" period={period} token={token} exportType="top-customers" exportFile="top-clientes.csv">
            <ReportHorizontalBars
              data={report.commercial.topCustomers.map((c) => ({ label: c.name, value: c.revenue }))}
              formatValue={formatMoney}
              color="#16A34A"
            />
          </ReportSection>
          <ReportSection title="Origem" period={period} token={token} exportType="customer-origins" exportFile="origem-clientes.csv">
            <ReportHorizontalBars
              data={report.commercial.customersByOrigin.map((o) => ({ label: o.origin, value: o.count }))}
              color="#6366F1"
            />
          </ReportSection>
          <ReportSection title="Retorno" period={period} token={token} exportType="returning-customers" exportFile="clientes-retorno.csv">
            <p className="text-[12px] text-[#64748B] mb-2">{report.commercial.returningCustomers.rate}% de retorno</p>
            <ReportHorizontalBars
              data={report.commercial.returningCustomers.list.map((c) => ({ label: c.name, value: c.revenue }))}
              formatValue={formatMoney}
            />
          </ReportSection>
          <ReportSection title="Inativos 90d" period={period} token={token} exportType="inactive-customers" exportFile="clientes-inativos.csv">
            <RankList
              rows={report.commercial.inactiveCustomers.slice(0, 15).map((c) => ({
                key: c.id,
                label: c.name,
                value: c.phone ?? "—",
              }))}
            />
          </ReportSection>
        </div>
      )}

      {tab === "inventory" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReportSection title="Giro de estoque" period={period} token={token} exportType="top-moving-products" exportFile="giro-estoque.csv">
            <ReportHorizontalBars
              data={report.inventory.topMovingProducts.map((p) => ({ label: p.name, value: p.soldQty }))}
            />
          </ReportSection>
          <ReportSection title="Compras por fornecedor" period={period} token={token} exportType="purchases-by-supplier" exportFile="compras-fornecedor.csv">
            <ReportHorizontalBars
              data={report.inventory.purchasesBySupplier.map((s) => ({ label: s.supplier, value: s.total }))}
              formatValue={formatMoney}
            />
          </ReportSection>
          <ReportSection title="Sugestao de compra" period={period} token={token} exportType="reorder-suggestion" exportFile="sugestao-compra.csv">
            <RankList
              rows={report.inventory.reorderSuggestion.map((p, i) => ({
                key: String(i),
                label: p.name,
                value: `+${p.suggestedQty} (atual ${p.currentStock})`,
              }))}
              empty="Estoque OK."
            />
          </ReportSection>
          <ReportSection title="Resumo estoque" period={period} token={token} exportType="stock-value" exportFile="valor-estoque.csv">
            <div className="space-y-3 text-[14px]">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Valor em estoque</span>
                <span className="font-bold">{formatMoney(report.inventory.stockValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Itens abaixo do minimo</span>
                <span className="font-bold text-[#DC2626]">{report.inventory.lowStockCount}</span>
              </div>
            </div>
          </ReportSection>
        </div>
      )}
    </div>
  );
}
