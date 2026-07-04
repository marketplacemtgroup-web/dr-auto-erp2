import { useEffect, useState } from "react";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import { useAuthStore } from "../../stores/authStore";
import { api, type FinancialAccountRow, type LoanRow } from "../../lib/api";
import { formatMoney, formatDate } from "../../lib/format";

export default function FinancialLoansPage() {
  const token = useAuthStore((s) => s.session?.accessToken ?? null);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccountRow[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bankName: "",
    contractNumber: "",
    principalAmount: "",
    interestRate: "",
    installments: "12",
    installmentAmount: "",
    firstDueDate: "",
    destinationAccountId: "",
    notes: "",
  });

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [l, a] = await Promise.all([api.financialLoans(token), api.financialAccounts(token)]);
      setLoans(l);
      setAccounts(a);
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
    await api.createFinancialLoan(token, {
      bankName: form.bankName,
      contractNumber: form.contractNumber || undefined,
      principalAmount: Number(form.principalAmount),
      interestRate: form.interestRate ? Number(form.interestRate) : undefined,
      installments: Number(form.installments),
      installmentAmount: Number(form.installmentAmount),
      firstDueDate: form.firstDueDate,
      destinationAccountId: form.destinationAccountId,
      notes: form.notes || undefined,
    });
    setDrawerOpen(false);
    void load();
  }

  return (
    <>
      <ModulePageShell title="Empréstimos" description="Controle de dívidas e parcelas" actionLabel="+ Novo empréstimo" onAction={() => setDrawerOpen(true)}>
        {loading ? (
          <p className="text-[#64748B]">Carregando...</p>
        ) : (
          <div className="space-y-4">
            {loans.map((loan) => (
              <div key={loan.id} className="bg-white rounded-xl card-shadow p-5">
                <div className="flex flex-wrap justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-[#1E293B]">{loan.bankName}</h3>
                    <p className="text-[12px] text-[#64748B]">{loan.contractNumber ?? "Sem contrato"} · {loan.installments}x de {formatMoney(Number(loan.installmentAmount))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-[#94A3B8]">Saldo devedor</p>
                    <p className="text-lg font-bold text-red-600">{formatMoney(Number(loan.outstandingBalance))}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
                  {loan.loanInstallments?.map((inst) => (
                    <div key={inst.id} className={`rounded-lg border px-2 py-1.5 ${inst.status === "PAID" ? "border-green-200 bg-green-50" : inst.status === "OVERDUE" ? "border-red-200 bg-red-50" : "border-[#E2E8F0]"}`}>
                      <p className="font-medium">{inst.installmentNumber}/{loan.installments}</p>
                      <p className="text-[#64748B]">{formatDate(inst.dueDate)}</p>
                      <p>{formatMoney(Number(inst.amount))}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ModulePageShell>

      <FormDrawer open={drawerOpen} title="Novo empréstimo" onClose={() => setDrawerOpen(false)} onSubmit={handleCreate}>
        <FormField label="Banco *"><input className={inputClass} value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} required /></FormField>
        <FormField label="Contrato"><input className={inputClass} value={form.contractNumber} onChange={(e) => setForm((f) => ({ ...f, contractNumber: e.target.value }))} /></FormField>
        <FormField label="Valor principal (R$) *"><input type="number" step="0.01" className={inputClass} value={form.principalAmount} onChange={(e) => setForm((f) => ({ ...f, principalAmount: e.target.value }))} required /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Parcelas *"><input type="number" min={1} className={inputClass} value={form.installments} onChange={(e) => setForm((f) => ({ ...f, installments: e.target.value }))} required /></FormField>
          <FormField label="Valor parcela *"><input type="number" step="0.01" className={inputClass} value={form.installmentAmount} onChange={(e) => setForm((f) => ({ ...f, installmentAmount: e.target.value }))} required /></FormField>
        </div>
        <FormField label="Juros (% a.m.)"><input type="number" step="0.01" className={inputClass} value={form.interestRate} onChange={(e) => setForm((f) => ({ ...f, interestRate: e.target.value }))} /></FormField>
        <FormField label="1º vencimento *"><input type="date" className={inputClass} value={form.firstDueDate} onChange={(e) => setForm((f) => ({ ...f, firstDueDate: e.target.value }))} required /></FormField>
        <FormField label="Conta destino *">
          <select className={selectClass} value={form.destinationAccountId} onChange={(e) => setForm((f) => ({ ...f, destinationAccountId: e.target.value }))} required>
            <option value="">Selecione</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </FormField>
      </FormDrawer>
    </>
  );
}
