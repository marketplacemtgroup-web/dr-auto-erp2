import { Fragment, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass } from "../../components/modules/FormDrawer";
import KpiStrip from "../../components/modules/KpiStrip";
import { useAuthStore } from "../../stores/authStore";
import { api, type CashSessionRow, type FinancialEntryRow, type PaymentMethod } from "../../lib/api";
import { useDashboardKpis } from "../../hooks/useDashboardKpis";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CARD: "Cartão",
  BOLETO: "Boleto",
  TRANSFER: "Transferência",
  OTHER: "Outro",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function cashBalance(session: CashSessionRow) {
  let balance = Number(session.openingBalance);
  for (const m of session.movements) {
    const amt = Number(m.amount);
    if (m.movementType === "SUPPLY" || m.movementType === "PAYMENT_IN") balance += amt;
    else balance -= amt;
  }
  return balance;
}

export default function FinancialPage() {
  const token = useAuthStore((s) => s.session?.accessToken ?? null);
  const { data: kpis } = useDashboardKpis();
  const [tab, setTab] = useState<"entries" | "cash">("entries");
  const [rows, setRows] = useState<FinancialEntryRow[]>([]);
  const [cashSession, setCashSession] = useState<CashSessionRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<"RECEIVABLE" | "PAYABLE">("RECEIVABLE");
  const [payTarget, setPayTarget] = useState<FinancialEntryRow | null>(null);
  const [payForm, setPayForm] = useState<{ paymentMethod: PaymentMethod; registerInCash: boolean }>({
    paymentMethod: "PIX",
    registerInCash: false,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: "",
    dueDate: "",
    amount: "",
    installments: "1",
  });
  const [cashForm, setCashForm] = useState({ openingBalance: "0", closingBalance: "", movementAmount: "", movementDesc: "" });

  async function loadEntries(nextSearch?: string) {
    if (!token) return;
    setLoading(true);
    try {
      setRows(await api.financialEntries(token, nextSearch));
    } finally {
      setLoading(false);
    }
  }

  async function loadCash() {
    if (!token) return;
    try {
      setCashSession(await api.cashCurrent(token));
    } catch {
      setCashSession(null);
    }
  }

  useEffect(() => {
    void loadEntries();
    void loadCash();
  }, [token]);

  const create = useMutation({
    mutationFn: () => {
      const base = {
        description: form.description,
        type: drawerType,
        dueDate: form.dueDate,
        amount: Number(form.amount),
      };
      const n = Number(form.installments);
      if (n > 1) return api.createFinancialInstallments(token!, { ...base, installments: n });
      return api.createFinancialEntry(token!, base);
    },
    onSuccess: () => {
      void loadEntries(search);
      setDrawerOpen(false);
      setForm({ description: "", dueDate: "", amount: "", installments: "1" });
    },
  });

  const pay = useMutation({
    mutationFn: () =>
      api.payFinancialEntry(token!, payTarget!.id, {
        paymentMethod: payForm.paymentMethod,
        registerInCash: payForm.registerInCash && payForm.paymentMethod === "CASH",
      }),
    onSuccess: () => {
      void loadEntries(search);
      void loadCash();
      setPayTarget(null);
    },
  });

  const totals = useMemo(() => {
    let openRecv = 0;
    let openPay = 0;
    for (const r of rows) {
      const amount = Number(r.amount ?? 0);
      if (r.status !== "OPEN") continue;
      if (r.type === "RECEIVABLE") openRecv += amount;
      else openPay += amount;
    }
    return { openRecv, openPay };
  }, [rows]);

  function openNew(type: "RECEIVABLE" | "PAYABLE") {
    setDrawerType(type);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setForm({
      description: "",
      dueDate: today.toISOString().slice(0, 10),
      amount: "",
      installments: "1",
    });
    setDrawerOpen(true);
  }

  function openPay(row: FinancialEntryRow) {
    setPayTarget(row);
    setPayForm({ paymentMethod: "PIX", registerInCash: !!cashSession });
  }

  return (
    <>
      <ModulePageShell
        title="Financeiro"
        description="Contas, parcelas, caixa e formas de pagamento"
        onSearch={tab === "entries" ? (q) => { setSearch(q); void loadEntries(q); } : undefined}
      >
        <KpiStrip
          items={[
            { label: "Faturamento (mes)", value: formatCurrency(kpis?.monthlyRevenue ?? 0), tone: "success" },
            { label: "A receber (aberto)", value: formatCurrency(totals.openRecv) },
            { label: "A pagar (aberto)", value: formatCurrency(totals.openPay), tone: "danger" },
            {
              label: "Caixa",
              value: cashSession ? formatCurrency(cashBalance(cashSession)) : "Fechado",
              tone: cashSession ? "success" : "default",
            },
          ]}
        />

        <div className="flex gap-2 mb-4 border-b border-[#E2E8F0]">
          {(["entries", "cash"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t ? "border-[#0E7490] text-[#0E7490]" : "border-transparent text-[#64748B]"
              }`}
            >
              {t === "entries" ? "Lancamentos" : "Caixa"}
            </button>
          ))}
        </div>

        {tab === "entries" ? (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              <button type="button" onClick={() => openNew("RECEIVABLE")} className="h-10 px-4 rounded-lg bg-[#16A34A] text-white text-sm font-medium">
                + Novo recebimento
              </button>
              <button type="button" onClick={() => openNew("PAYABLE")} className="h-10 px-4 rounded-lg bg-[#DC2626] text-white text-sm font-medium">
                + Nova despesa
              </button>
            </div>
            <div className="bg-white rounded-xl card-shadow overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    <th className="text-left px-4 py-2">Descricao</th>
                    <th className="text-left px-4 py-2">Vinculo</th>
                    <th className="text-left px-4 py-2">Venc.</th>
                    <th className="text-right px-4 py-2">Valor</th>
                    <th className="text-right px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-[#64748B]">Carregando...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-[#64748B]">Nenhum lancamento.</td></tr>
                  ) : (
                    rows.map((r) => (
                      <Fragment key={r.id}>
                        <tr className="border-t border-[#E2E8F0]">
                          <td className="px-4 py-3">
                            <span className={r.type === "RECEIVABLE" ? "text-[#16A34A]" : "text-[#DC2626]"}>
                              {r.description}
                            </span>
                            {r.installmentTotal && r.installmentTotal > 1 ? (
                              <span className="ml-2 text-[11px] text-[#94A3B8]">({r.installmentTotal}x)</span>
                            ) : null}
                            {r.status === "PAID" && r.paymentMethod ? (
                              <div className="text-[11px] text-[#94A3B8]">{PAYMENT_LABELS[r.paymentMethod]}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-[12px] text-[#64748B]">
                            {r.customer?.name && <div>{r.customer.name}</div>}
                            {r.serviceOrder && <div>OS #{r.serviceOrder.number}</div>}
                          </td>
                          <td className="px-4 py-3">{formatDate(r.dueDate)}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(Number(r.amount))}</td>
                          <td className="px-4 py-3 text-right space-x-2">
                            {r.installments && r.installments.length > 0 ? (
                              <button type="button" className="text-[12px] text-[#64748B]" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                                Parcelas
                              </button>
                            ) : null}
                            <button
                              type="button"
                              disabled={r.status === "PAID" || !token}
                              onClick={() => openPay(r)}
                              className="text-[12px] text-[#0E7490] hover:underline disabled:text-[#94A3B8]"
                            >
                              Baixar
                            </button>
                          </td>
                        </tr>
                        {expandedId === r.id && r.installments?.map((p) => (
                          <tr key={p.id} className="bg-[#F8FAFC] border-t border-[#E2E8F0]">
                            <td className="px-4 py-2 pl-8 text-[12px]">{p.description}</td>
                            <td />
                            <td className="px-4 py-2 text-[12px]">{formatDate(p.dueDate)}</td>
                            <td className="px-4 py-2 text-right text-[12px]">{formatCurrency(Number(p.amount))}</td>
                            <td className="px-4 py-2 text-right">
                              {p.status === "OPEN" ? (
                                <button type="button" className="text-[12px] text-[#0E7490]" onClick={() => openPay(p)}>Baixar</button>
                              ) : (
                                <span className="text-[11px] text-[#94A3B8]">Pago</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl card-shadow p-5 max-w-xl">
            {!cashSession ? (
              <>
                <h3 className="text-[14px] font-semibold mb-3">Abrir caixa</h3>
                <FormField label="Saldo inicial (R$)">
                  <input
                    className={inputClass}
                    type="number"
                    step="0.01"
                    value={cashForm.openingBalance}
                    onChange={(e) => setCashForm((f) => ({ ...f, openingBalance: e.target.value }))}
                  />
                </FormField>
                <button
                  type="button"
                  disabled={!token}
                  className="mt-3 h-10 px-4 rounded-lg bg-[#0E7490] text-white text-sm"
                  onClick={() =>
                    token &&
                    api.cashOpen(token, Number(cashForm.openingBalance)).then((s) => setCashSession(s))
                  }
                >
                  Abrir caixa
                </button>
              </>
            ) : (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-[14px] font-semibold">Caixa aberto</h3>
                    <p className="text-[12px] text-[#64748B]">
                      por {cashSession.openedBy?.name} — {formatDate(cashSession.openedAt)}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-[#16A34A]">{formatCurrency(cashBalance(cashSession))}</p>
                </div>
                <ul className="text-[12px] space-y-1 mb-4 max-h-40 overflow-y-auto">
                  {cashSession.movements.map((m) => (
                    <li key={m.id} className="flex justify-between text-[#64748B]">
                      <span>{m.description ?? m.movementType}</span>
                      <span>{formatCurrency(Number(m.amount))}</span>
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <FormField label="Suprimento">
                    <input className={inputClass} type="number" value={cashForm.movementAmount} onChange={(e) => setCashForm((f) => ({ ...f, movementAmount: e.target.value }))} />
                  </FormField>
                  <div className="flex items-end">
                    <button
                      type="button"
                      className="h-10 w-full rounded-lg border border-[#E2E8F0] text-sm"
                      onClick={() =>
                        token &&
                        api
                          .cashMovement(token, cashSession.id, {
                            movementType: "SUPPLY",
                            amount: Number(cashForm.movementAmount),
                          })
                          .then((s) => s && setCashSession(s))
                      }
                    >
                      + Suprimento
                    </button>
                  </div>
                </div>
                <FormField label="Saldo ao fechar">
                  <input className={inputClass} type="number" value={cashForm.closingBalance} onChange={(e) => setCashForm((f) => ({ ...f, closingBalance: e.target.value }))} />
                </FormField>
                <button
                  type="button"
                  className="mt-3 h-10 px-4 rounded-lg bg-[#DC2626] text-white text-sm"
                  onClick={() =>
                    token &&
                    api
                      .cashClose(token, cashSession.id, Number(cashForm.closingBalance))
                      .then(() => { setCashSession(null); setCashForm((f) => ({ ...f, closingBalance: "" })); })
                  }
                >
                  Fechar caixa
                </button>
              </>
            )}
          </div>
        )}
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        title={drawerType === "RECEIVABLE" ? "Novo recebimento" : "Nova despesa"}
        onClose={() => setDrawerOpen(false)}
        onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
        loading={create.isPending}
      >
        <FormField label="Descricao *">
          <input className={inputClass} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
        </FormField>
        <FormField label="Vencimento *">
          <input type="date" className={inputClass} value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} required />
        </FormField>
        <FormField label="Valor (R$) *">
          <input type="number" step="0.01" className={inputClass} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
        </FormField>
        <FormField label="Parcelas">
          <input type="number" min={1} max={24} className={inputClass} value={form.installments} onChange={(e) => setForm((f) => ({ ...f, installments: e.target.value }))} />
        </FormField>
      </FormDrawer>

      <FormDrawer
        open={!!payTarget}
        title="Baixar lancamento"
        onClose={() => setPayTarget(null)}
        onSubmit={(e) => { e.preventDefault(); pay.mutate(); }}
        loading={pay.isPending}
      >
        <p className="text-sm text-[#64748B] mb-3">{payTarget?.description}</p>
        <FormField label="Forma de pagamento">
          <select
            className={inputClass}
            value={payForm.paymentMethod}
            onChange={(e) => setPayForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
          >
            {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((k) => (
              <option key={k} value={k}>{PAYMENT_LABELS[k]}</option>
            ))}
          </select>
        </FormField>
        {cashSession && payTarget?.type === "RECEIVABLE" ? (
          <label className="flex items-center gap-2 text-sm text-[#64748B] mt-2">
            <input
              type="checkbox"
              checked={payForm.registerInCash}
              onChange={(e) => setPayForm((f) => ({ ...f, registerInCash: e.target.checked }))}
              disabled={payForm.paymentMethod !== "CASH"}
            />
            Registrar no caixa (dinheiro)
          </label>
        ) : null}
      </FormDrawer>
    </>
  );
}
