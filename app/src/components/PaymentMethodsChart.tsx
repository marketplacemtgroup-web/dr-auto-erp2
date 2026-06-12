import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApiQuery } from "../hooks/useApiQuery";
import { api } from "../lib/api";
import { formatMoney } from "../lib/format";
import { PAYMENT_LABELS, PAYMENT_METHODS } from "../lib/paymentMethods";
import { routes } from "../lib/routes";
import NavButton from "./NavButton";

export default function PaymentMethodsChart() {
  const { data = [], isLoading } = useApiQuery(
    ["financial", "cash-flow"],
    (t) => api.financialCashFlow(t),
  );

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const totals = new Map<string, number>();
  for (const row of data) {
    if (row.type !== "RECEIVABLE" || !row.paidAt) continue;
    const paidAt = new Date(row.paidAt);
    if (paidAt < monthStart) continue;
    const method = row.paymentMethod ?? "OTHER";
    totals.set(method, (totals.get(method) ?? 0) + Number(row.amount));
  }

  const chartData = PAYMENT_METHODS.map((method) => ({
    name: PAYMENT_LABELS[method],
    value: totals.get(method) ?? 0,
  })).filter((d) => d.value > 0);

  const monthTotal = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white rounded-xl card-shadow p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[14px] font-semibold text-[#1E293B] truncate">
          Formas de Pagamento (Mes)
        </h3>
        <NavButton
          to={routes.financeiro}
          className="text-[12px] text-[#94A3B8] hover:text-[#0E7490] transition-colors shrink-0"
        >
          Ver financeiro
        </NavButton>
      </div>

      <div className="mb-4">
        <span className="text-[20px] font-bold text-[#1E293B]">{formatMoney(monthTotal)}</span>
        <p className="text-[11px] text-[#94A3B8] mt-0.5">Recebimentos pagos neste mes</p>
      </div>

      <div className="h-[200px]">
        {isLoading ? (
          <p className="text-sm text-[#94A3B8] text-center pt-16">Carregando...</p>
        ) : chartData.length === 0 ? (
          <p className="text-[13px] text-[#64748B] py-8 text-center">
            Nenhum recebimento baixado neste mes. Confirme pagamentos no Financeiro.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => formatMoney(v)} />
              <YAxis dataKey="name" type="category" width={72} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Bar dataKey="value" fill="#0E7490" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
