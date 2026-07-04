import { useEffect, useState } from "react";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import { useAuthStore } from "../../stores/authStore";
import { api, type BankReconciliationRow, type FinancialAccountRow } from "../../lib/api";
import { formatMoney, formatDate } from "../../lib/format";

export default function FinancialReconciliationPage() {
  const token = useAuthStore((s) => s.session?.accessToken ?? null);
  const [rows, setRows] = useState<BankReconciliationRow[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccountRow[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    accountId: "",
    periodStart: "",
    periodEnd: "",
    bankBalance: "",
    notes: "",
  });

  async function load() {
    if (!token) return;
    const [r, a] = await Promise.all([
      api.bankReconciliations(token),
      api.financialAccounts(token),
    ]);
    setRows(r);
    setAccounts(a);
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    await api.createBankReconciliation(token, {
      accountId: form.accountId,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      bankBalance: Number(form.bankBalance),
      notes: form.notes || undefined,
    });
    setDrawerOpen(false);
    void load();
  }

  return (
    <>
      <ModulePageShell
        title="Conciliação bancária"
        description="Compare saldo do banco com o sistema — estrutura preparada para importação OFX"
        actionLabel="+ Nova conciliação"
        onAction={() => setDrawerOpen(true)}
      >
        <div className="bg-white rounded-xl card-shadow overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="text-left px-4 py-2">Período</th>
                <th className="text-right px-4 py-2">Banco</th>
                <th className="text-right px-4 py-2">Sistema</th>
                <th className="text-right px-4 py-2">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-[#64748B]">Nenhuma conciliação registrada.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-t border-[#E2E8F0]">
                  <td className="px-4 py-3">{formatDate(r.periodStart)} — {formatDate(r.periodEnd)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(Number(r.bankBalance))}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(Number(r.systemBalance))}</td>
                  <td className={`px-4 py-3 text-right font-medium ${Number(r.difference) === 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatMoney(Number(r.difference))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[12px] text-[#94A3B8] mt-4">
          Importação OFX será adicionada em versão futura. Cada movimento possui campo externalRef preparado.
        </p>
      </ModulePageShell>

      <FormDrawer open={drawerOpen} title="Nova conciliação" onClose={() => setDrawerOpen(false)} onSubmit={handleCreate}>
        <FormField label="Conta *">
          <select className={selectClass} value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))} required>
            <option value="">Selecione</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Início *"><input type="date" className={inputClass} value={form.periodStart} onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))} required /></FormField>
          <FormField label="Fim *"><input type="date" className={inputClass} value={form.periodEnd} onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))} required /></FormField>
        </div>
        <FormField label="Saldo no extrato bancário (R$) *"><input type="number" step="0.01" className={inputClass} value={form.bankBalance} onChange={(e) => setForm((f) => ({ ...f, bankBalance: e.target.value }))} required /></FormField>
        <FormField label="Observações"><input className={inputClass} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></FormField>
      </FormDrawer>
    </>
  );
}
