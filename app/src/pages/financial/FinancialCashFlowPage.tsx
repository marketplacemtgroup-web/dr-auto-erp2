import { useEffect, useMemo, useState } from "react";
import ModulePageShell from "../../components/modules/ModulePageShell";
import KpiStrip from "../../components/modules/KpiStrip";
import { useAuthStore } from "../../stores/authStore";
import { api, type CashFlowReport, type FinancialAccountRow } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { usePermissions } from "../../hooks/usePermissions";

const GROUP_OPTIONS = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
] as const;

export default function FinancialCashFlowPage() {
  const token = useAuthStore((s) => s.session?.accessToken ?? null);
  const { canViewMoney } = usePermissions();
  const showMoney = canViewMoney();
  const [report, setReport] = useState<CashFlowReport | null>(null);
  const [accounts, setAccounts] = useState<FinancialAccountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(monthStart.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month" | "year">("day");
  const [accountId, setAccountId] = useState("");

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [r, accs] = await Promise.all([
        api.financialCashFlowReport(token, { from, to, groupBy, accountId: accountId || undefined }),
        api.financialAccounts(token),
      ]);
      setReport(r);
      setAccounts(accs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token, from, to, groupBy, accountId]);

  const maxPeriod = useMemo(() => {
    if (!report?.periods.length) return 1;
    return Math.max(...report.periods.map((p) => Math.max(p.inflows, p.outflows)), 1);
  }, [report]);

  return (
    <ModulePageShell title="Fluxo de Caixa" description="Entradas, saídas e saldo por período">
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-[11px] text-[#64748B] block mb-1">De</label>
          <input type="date" className="h-9 px-2 rounded-lg border border-[#E2E8F0] text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] text-[#64748B] block mb-1">Até</label>
          <input type="date" className="h-9 px-2 rounded-lg border border-[#E2E8F0] text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] text-[#64748B] block mb-1">Agrupar</label>
          <select className="h-9 px-2 rounded-lg border border-[#E2E8F0] text-sm" value={groupBy} onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}>
            {GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-[#64748B] block mb-1">Conta</label>
          <select className="h-9 px-2 rounded-lg border border-[#E2E8F0] text-sm min-w-[160px]" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Todas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {showMoney && report ? (
        <KpiStrip
          items={[
            { label: "Saldo inicial", value: formatMoney(report.openingBalance) },
            { label: "Entradas", value: formatMoney(report.totalInflows), tone: "success" },
            { label: "Saídas", value: formatMoney(report.totalOutflows), tone: "danger" },
            { label: "Saldo final", value: formatMoney(report.closingBalance), tone: "success" },
            { label: "Receitas", value: formatMoney(report.receivables) },
            { label: "Despesas", value: formatMoney(report.payables), tone: "danger" },
            { label: "Transferências", value: formatMoney(report.transfers) },
            { label: "Aportes", value: formatMoney(report.contributions) },
            { label: "Retiradas", value: formatMoney(report.withdrawals), tone: "danger" },
          ]}
        />
      ) : null}

      {loading ? (
        <p className="text-[#64748B]">Carregando...</p>
      ) : report ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl card-shadow p-4">
            <h3 className="text-sm font-semibold mb-3">Por período</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {report.periods.map((p) => (
                <div key={p.period} className="border border-[#E2E8F0] rounded-lg p-3">
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="font-medium">{p.period}</span>
                    <span className={p.net >= 0 ? "text-green-600" : "text-red-600"}>{formatMoney(p.net)}</span>
                  </div>
                  <div className="h-2 bg-[#F1F5F9] rounded overflow-hidden flex">
                    <div className="bg-green-500 h-full" style={{ width: `${(p.inflows / maxPeriod) * 100}%` }} />
                    <div className="bg-red-400 h-full" style={{ width: `${(p.outflows / maxPeriod) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1">
                    <span>+{formatMoney(p.inflows)}</span>
                    <span>-{formatMoney(p.outflows)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl card-shadow overflow-hidden">
            <h3 className="text-sm font-semibold px-4 py-3 border-b border-[#E2E8F0]">Movimentações</h3>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-[#F8FAFC] sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">Data</th>
                    <th className="text-left px-3 py-2">Conta</th>
                    <th className="text-left px-3 py-2">Tipo</th>
                    <th className="text-right px-3 py-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {report.movements.map((m) => (
                    <tr key={m.id} className="border-t border-[#F1F5F9]">
                      <td className="px-3 py-2">{m.movementDate.slice(0, 10)}</td>
                      <td className="px-3 py-2">{m.accountName}</td>
                      <td className="px-3 py-2 text-[#64748B]">{m.movementKind}</td>
                      <td className={`px-3 py-2 text-right font-medium ${m.direction === "CREDIT" ? "text-green-600" : "text-red-600"}`}>
                        {m.direction === "CREDIT" ? "+" : "-"}{formatMoney(m.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </ModulePageShell>
  );
}
