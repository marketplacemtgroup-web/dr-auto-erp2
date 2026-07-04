import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import ModulePageShell from "../../components/modules/ModulePageShell";
import KpiStrip from "../../components/modules/KpiStrip";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import { useAuthStore } from "../../stores/authStore";
import { api, type FinancialAccountRow } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { usePermissions } from "../../hooks/usePermissions";

const ACCOUNT_TYPES = [
  { value: "CAIXA", label: "Caixa" },
  { value: "BANCO", label: "Banco" },
  { value: "CARTEIRA_DIGITAL", label: "Carteira digital" },
  { value: "MAQUININHA", label: "Maquininha" },
  { value: "COFRE", label: "Cofre" },
  { value: "SOCIO_PF", label: "Conta PF sócio" },
];

export default function FinancialAccountsPage() {
  const token = useAuthStore((s) => s.session?.accessToken ?? null);
  const { canViewMoney } = usePermissions();
  const showMoney = canViewMoney();
  const [accounts, setAccounts] = useState<FinancialAccountRow[]>([]);
  const [summary, setSummary] = useState<{ totalBalance: number; cashBalance: number; bankBalance: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "BANCO",
    bank: "",
    agency: "",
    accountNumber: "",
    holder: "",
    openingBalance: "0",
    color: "#0E7490",
  });

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [list, sum] = await Promise.all([
        api.financialAccounts(token),
        api.financialAccountsSummary(token),
      ]);
      setAccounts(list);
      setSummary(sum);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    await api.createFinancialAccount(token, {
      name: form.name,
      type: form.type as FinancialAccountRow["type"],
      bank: form.bank || undefined,
      agency: form.agency || undefined,
      accountNumber: form.accountNumber || undefined,
      holder: form.holder || undefined,
      openingBalance: Number(form.openingBalance) || 0,
      color: form.color,
    });
    setDrawerOpen(false);
    setForm({ name: "", type: "BANCO", bank: "", agency: "", accountNumber: "", holder: "", openingBalance: "0", color: "#0E7490" });
    void load();
  }

  return (
    <>
      <ModulePageShell
        title="Contas Financeiras"
        description="Onde o dinheiro está — caixa, bancos, carteiras digitais"
        actionLabel="+ Nova conta"
        onAction={() => setDrawerOpen(true)}
      >
        {showMoney && summary ? (
          <KpiStrip
            items={[
              { label: "Saldo total", value: formatMoney(summary.totalBalance), tone: "success" },
              { label: "Caixa", value: formatMoney(summary.cashBalance) },
              { label: "Bancos", value: formatMoney(summary.bankBalance) },
              { label: "Contas ativas", value: String(accounts.filter((a) => a.status === "ACTIVE").length) },
            ]}
          />
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <p className="text-[#64748B] col-span-full">Carregando...</p>
          ) : accounts.length === 0 ? (
            <p className="text-[#64748B] col-span-full">Nenhuma conta cadastrada.</p>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-white rounded-xl card-shadow p-5 border-l-4"
                style={{ borderLeftColor: acc.color }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Wallet size={18} className="text-[#64748B]" />
                    <div>
                      <h3 className="font-semibold text-[#1E293B]">{acc.name}</h3>
                      <p className="text-[11px] text-[#94A3B8] uppercase">
                        {ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label ?? acc.type}
                        {acc.isPrimary ? " · Principal" : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${acc.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {acc.status === "ACTIVE" ? "Ativa" : "Inativa"}
                  </span>
                </div>
                {acc.bank ? <p className="text-[12px] text-[#64748B] mt-2">{acc.bank}{acc.accountNumber ? ` · ${acc.accountNumber}` : ""}</p> : null}
                {showMoney ? (
                  <p className="text-2xl font-bold text-[#0F3D4C] mt-3">{formatMoney(Number(acc.currentBalance))}</p>
                ) : (
                  <p className="text-lg text-[#94A3B8] mt-3">••••••</p>
                )}
              </div>
            ))
          )}
        </div>
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        title="Nova conta financeira"
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleCreate}
      >
        <FormField label="Nome *">
          <input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </FormField>
        <FormField label="Tipo *">
          <select className={selectClass} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Banco">
          <input className={inputClass} value={form.bank} onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Agência">
            <input className={inputClass} value={form.agency} onChange={(e) => setForm((f) => ({ ...f, agency: e.target.value }))} />
          </FormField>
          <FormField label="Conta">
            <input className={inputClass} value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} />
          </FormField>
        </div>
        <FormField label="Titular">
          <input className={inputClass} value={form.holder} onChange={(e) => setForm((f) => ({ ...f, holder: e.target.value }))} />
        </FormField>
        <FormField label="Saldo inicial (R$)">
          <input type="number" step="0.01" className={inputClass} value={form.openingBalance} onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))} />
        </FormField>
      </FormDrawer>
    </>
  );
}
