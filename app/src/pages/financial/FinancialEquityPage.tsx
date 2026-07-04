import { useEffect, useState } from "react";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import { useAuthStore } from "../../stores/authStore";
import {
  api,
  type CapitalContributionRow,
  type FinancialAccountRow,
  type FinancialTransferRow,
  type PartnerWithdrawalRow,
} from "../../lib/api";
import { formatMoney, formatDate } from "../../lib/format";

type Tab = "transfers" | "contributions" | "withdrawals";

export default function FinancialEquityPage() {
  const token = useAuthStore((s) => s.session?.accessToken ?? null);
  const [tab, setTab] = useState<Tab>("transfers");
  const [accounts, setAccounts] = useState<FinancialAccountRow[]>([]);
  const [transfers, setTransfers] = useState<FinancialTransferRow[]>([]);
  const [contributions, setContributions] = useState<CapitalContributionRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<PartnerWithdrawalRow[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [transferForm, setTransferForm] = useState({ fromAccountId: "", toAccountId: "", amount: "", transferDate: new Date().toISOString().slice(0, 10), notes: "" });
  const [contributionForm, setContributionForm] = useState({ partnerName: "", toAccountId: "", amount: "", contributionDate: new Date().toISOString().slice(0, 10), reason: "" });
  const [withdrawalForm, setWithdrawalForm] = useState({ partnerName: "", fromAccountId: "", amount: "", withdrawalDate: new Date().toISOString().slice(0, 10), withdrawalType: "PARTICULAR", reason: "" });

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [accs, tr, co, wi] = await Promise.all([
        api.financialAccounts(token),
        api.financialTransfers(token),
        api.capitalContributions(token),
        api.partnerWithdrawals(token),
      ]);
      setAccounts(accs);
      setTransfers(tr.data ?? []);
      setContributions(co);
      setWithdrawals(wi);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (tab === "transfers") {
      await api.createFinancialTransfer(token, {
        fromAccountId: transferForm.fromAccountId,
        toAccountId: transferForm.toAccountId,
        amount: Number(transferForm.amount),
        transferDate: transferForm.transferDate,
        notes: transferForm.notes || undefined,
      });
    } else if (tab === "contributions") {
      await api.createCapitalContribution(token, {
        partnerName: contributionForm.partnerName,
        toAccountId: contributionForm.toAccountId,
        amount: Number(contributionForm.amount),
        contributionDate: contributionForm.contributionDate,
        reason: contributionForm.reason || undefined,
      });
    } else {
      await api.createPartnerWithdrawal(token, {
        partnerName: withdrawalForm.partnerName,
        fromAccountId: withdrawalForm.fromAccountId,
        amount: Number(withdrawalForm.amount),
        withdrawalDate: withdrawalForm.withdrawalDate,
        withdrawalType: withdrawalForm.withdrawalType as PartnerWithdrawalRow["withdrawalType"],
        reason: withdrawalForm.reason || undefined,
      });
    }
    setDrawerOpen(false);
    void load();
  }

  const drawerTitle =
    tab === "transfers" ? "Nova transferência" : tab === "contributions" ? "Novo aporte" : "Nova retirada";

  return (
    <>
      <ModulePageShell
        title="Movimentações patrimoniais"
        description="Transferências, aportes e retiradas — não alteram faturamento"
        actionLabel={
          tab === "transfers" ? "+ Transferência" : tab === "contributions" ? "+ Aporte" : "+ Retirada"
        }
        onAction={() => setDrawerOpen(true)}
      >
        <div className="flex gap-2 mb-4 border-b border-[#E2E8F0]">
          {([
            ["transfers", "Transferências"],
            ["contributions", "Aportes"],
            ["withdrawals", "Retiradas"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === id ? "border-[#0E7490] text-[#0E7490]" : "border-transparent text-[#64748B]"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-[#64748B]">Carregando...</p>
        ) : tab === "transfers" ? (
          <div className="bg-white rounded-xl card-shadow overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-[#F8FAFC]"><tr><th className="text-left px-4 py-2">Data</th><th className="text-left px-4 py-2">Origem</th><th className="text-left px-4 py-2">Destino</th><th className="text-right px-4 py-2">Valor</th></tr></thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id} className="border-t border-[#E2E8F0]">
                    <td className="px-4 py-3">{formatDate(t.transferDate)}</td>
                    <td className="px-4 py-3">{t.fromAccount?.name}</td>
                    <td className="px-4 py-3">{t.toAccount?.name}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(Number(t.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === "contributions" ? (
          <div className="bg-white rounded-xl card-shadow overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-[#F8FAFC]"><tr><th className="text-left px-4 py-2">Data</th><th className="text-left px-4 py-2">Sócio</th><th className="text-left px-4 py-2">Conta</th><th className="text-right px-4 py-2">Valor</th></tr></thead>
              <tbody>
                {contributions.map((c) => (
                  <tr key={c.id} className="border-t border-[#E2E8F0]">
                    <td className="px-4 py-3">{formatDate(c.contributionDate)}</td>
                    <td className="px-4 py-3">{c.partnerName}</td>
                    <td className="px-4 py-3">{c.toAccount?.name}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">{formatMoney(Number(c.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl card-shadow overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-[#F8FAFC]"><tr><th className="text-left px-4 py-2">Data</th><th className="text-left px-4 py-2">Sócio</th><th className="text-left px-4 py-2">Tipo</th><th className="text-right px-4 py-2">Valor</th></tr></thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id} className="border-t border-[#E2E8F0]">
                    <td className="px-4 py-3">{formatDate(w.withdrawalDate)}</td>
                    <td className="px-4 py-3">{w.partnerName}</td>
                    <td className="px-4 py-3 text-[#64748B]">{w.withdrawalType}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">{formatMoney(Number(w.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ModulePageShell>

      <FormDrawer open={drawerOpen} title={drawerTitle} onClose={() => setDrawerOpen(false)} onSubmit={handleSubmit}>
        {tab === "transfers" ? (
          <>
            <FormField label="Conta origem *">
              <select className={selectClass} value={transferForm.fromAccountId} onChange={(e) => setTransferForm((f) => ({ ...f, fromAccountId: e.target.value }))} required>
                <option value="">Selecione</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </FormField>
            <FormField label="Conta destino *">
              <select className={selectClass} value={transferForm.toAccountId} onChange={(e) => setTransferForm((f) => ({ ...f, toAccountId: e.target.value }))} required>
                <option value="">Selecione</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </FormField>
            <FormField label="Valor (R$) *"><input type="number" step="0.01" className={inputClass} value={transferForm.amount} onChange={(e) => setTransferForm((f) => ({ ...f, amount: e.target.value }))} required /></FormField>
            <FormField label="Data *"><input type="date" className={inputClass} value={transferForm.transferDate} onChange={(e) => setTransferForm((f) => ({ ...f, transferDate: e.target.value }))} required /></FormField>
            <FormField label="Observação"><input className={inputClass} value={transferForm.notes} onChange={(e) => setTransferForm((f) => ({ ...f, notes: e.target.value }))} /></FormField>
          </>
        ) : tab === "contributions" ? (
          <>
            <FormField label="Sócio *"><input className={inputClass} value={contributionForm.partnerName} onChange={(e) => setContributionForm((f) => ({ ...f, partnerName: e.target.value }))} required /></FormField>
            <FormField label="Conta destino *">
              <select className={selectClass} value={contributionForm.toAccountId} onChange={(e) => setContributionForm((f) => ({ ...f, toAccountId: e.target.value }))} required>
                <option value="">Selecione</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </FormField>
            <FormField label="Valor (R$) *"><input type="number" step="0.01" className={inputClass} value={contributionForm.amount} onChange={(e) => setContributionForm((f) => ({ ...f, amount: e.target.value }))} required /></FormField>
            <FormField label="Data *"><input type="date" className={inputClass} value={contributionForm.contributionDate} onChange={(e) => setContributionForm((f) => ({ ...f, contributionDate: e.target.value }))} required /></FormField>
            <FormField label="Motivo"><input className={inputClass} value={contributionForm.reason} onChange={(e) => setContributionForm((f) => ({ ...f, reason: e.target.value }))} /></FormField>
          </>
        ) : (
          <>
            <FormField label="Sócio *"><input className={inputClass} value={withdrawalForm.partnerName} onChange={(e) => setWithdrawalForm((f) => ({ ...f, partnerName: e.target.value }))} required /></FormField>
            <FormField label="Conta origem *">
              <select className={selectClass} value={withdrawalForm.fromAccountId} onChange={(e) => setWithdrawalForm((f) => ({ ...f, fromAccountId: e.target.value }))} required>
                <option value="">Selecione</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </FormField>
            <FormField label="Tipo *">
              <select className={selectClass} value={withdrawalForm.withdrawalType} onChange={(e) => setWithdrawalForm((f) => ({ ...f, withdrawalType: e.target.value }))}>
                <option value="PRO_LABORE">Pró-labore</option>
                <option value="LUCROS">Distribuição de lucros</option>
                <option value="PARTICULAR">Retirada particular</option>
                <option value="ADIANTAMENTO">Adiantamento</option>
                <option value="OUTRO">Outro</option>
              </select>
            </FormField>
            <FormField label="Valor (R$) *"><input type="number" step="0.01" className={inputClass} value={withdrawalForm.amount} onChange={(e) => setWithdrawalForm((f) => ({ ...f, amount: e.target.value }))} required /></FormField>
            <FormField label="Data *"><input type="date" className={inputClass} value={withdrawalForm.withdrawalDate} onChange={(e) => setWithdrawalForm((f) => ({ ...f, withdrawalDate: e.target.value }))} required /></FormField>
          </>
        )}
      </FormDrawer>
    </>
  );
}
