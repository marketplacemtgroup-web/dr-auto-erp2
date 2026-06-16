import { Fragment, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router";
import { Trash2 } from "lucide-react";
import FinancialPayButton from "../../components/financial/FinancialPayButton";
import DeleteEntryModal from "../../components/financial/DeleteEntryModal";
import PayEntryModal from "../../components/financial/PayEntryModal";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass } from "../../components/modules/FormDrawer";
import KpiStrip from "../../components/modules/KpiStrip";
import { useAuthStore } from "../../stores/authStore";
import {
  api,
  type CashSessionRow,
  type FinancialEntryRow,
  type FinancialReceiveQueue,
  type FinancialReceiveQueueOrder,
} from "../../lib/api";
import { useDashboardKpis } from "../../hooks/useDashboardKpis";
import { serviceOrderStatusLabel } from "../../lib/labels";
import {
  computePayDiscount,
  createDefaultPayForm,
  formatPaymentSplitsLabel,
  type PayEntryFormState,
} from "../../lib/payEntry";

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

type FinanceiroLocationState = {
  tab?: "cash";
  payEntry?: FinancialEntryRow;
};

export default function FinancialPage() {
  const token = useAuthStore((s) => s.session?.accessToken ?? null);
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: kpis } = useDashboardKpis();
  const [tab, setTab] = useState<"entries" | "cash">("entries");
  const [rows, setRows] = useState<FinancialEntryRow[]>([]);
  const [cashSession, setCashSession] = useState<CashSessionRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<"RECEIVABLE" | "PAYABLE">("RECEIVABLE");
  const [payTarget, setPayTarget] = useState<FinancialEntryRow | null>(null);
  const [payForm, setPayForm] = useState<PayEntryFormState>(() => createDefaultPayForm(0));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: "",
    dueDate: "",
    amount: "",
    installments: "1",
  });
  const [cashForm, setCashForm] = useState({ openingBalance: "0", closingBalance: "", movementAmount: "", movementDesc: "" });
  const [receiveQueue, setReceiveQueue] = useState<FinancialReceiveQueue | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [chargingOrderId, setChargingOrderId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinancialEntryRow | null>(null);

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

  async function loadReceiveQueue() {
    if (!token) return;
    setQueueLoading(true);
    try {
      setReceiveQueue(await api.financialReceiveQueue(token));
    } finally {
      setQueueLoading(false);
    }
  }

  useEffect(() => {
    void loadEntries();
    void loadCash();
    void loadReceiveQueue();
  }, [token]);

  useEffect(() => {
    if (tab === "cash") void loadReceiveQueue();
  }, [tab, token]);

  useEffect(() => {
    const state = location.state as FinanceiroLocationState | null;
    if (!state?.tab && !state?.payEntry) return;

    if (state.tab === "cash") setTab("cash");

    if (state.payEntry) {
      setPayTarget(state.payEntry);
      setPayForm(
        createDefaultPayForm(Number(state.payEntry.amount), state.tab === "cash"),
      );
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

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
    mutationFn: () => {
      const gross = Number(payTarget!.amount);
      const discount = computePayDiscount(
        gross,
        payForm.discountMoney,
        payForm.discountPercent,
      );
      const splits = payForm.splits.map((row) => ({
        paymentMethod: row.paymentMethod,
        amount: Number(row.amount.replace(",", ".")) || 0,
        registerInCash: row.registerInCash && row.paymentMethod === "CASH",
      }));

      return api.payFinancialEntry(token!, payTarget!.id, {
        discountAmount: discount > 0 && payForm.discountMoney ? discount : undefined,
        discountPercent:
          discount > 0 && payForm.discountPercent
            ? Number(payForm.discountPercent.replace(",", "."))
            : undefined,
        splits,
      });
    },
    onSuccess: () => {
      void loadEntries(search);
      void loadCash();
      void loadReceiveQueue();
      void queryClient.invalidateQueries({ queryKey: ["financial", "cash-flow"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "kpis"] });
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

  function openPay(row: FinancialEntryRow, preferCash = tab === "cash") {
    setPayTarget(row);
    setPayForm(createDefaultPayForm(Number(row.amount), preferCash && !!cashSession));
  }

  async function chargeOrder(order: FinancialReceiveQueueOrder) {
    if (!token) return;
    setChargingOrderId(order.serviceOrderId);
    try {
      const entry = await api.financialFromServiceOrder(token, order.serviceOrderId);
      openPay(entry);
      void loadReceiveQueue();
      void loadEntries(search);
    } finally {
      setChargingOrderId(null);
    }
  }

  async function deleteEntry(row: FinancialEntryRow) {
    setDeleteTarget(row);
  }

  async function confirmDeleteEntry(reason: string) {
    if (!token || !deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await api.deleteFinancialEntry(token, deleteTarget.id, reason);
      void loadEntries(search);
      void loadCash();
      void loadReceiveQueue();
      void queryClient.invalidateQueries({ queryKey: ["financial", "cash-flow"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "kpis"] });
      if (expandedId === deleteTarget.id) setExpandedId(null);
      setDeleteTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Nao foi possivel excluir o lancamento");
    } finally {
      setDeletingId(null);
    }
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
                            {r.status === "PAID" &&
                            (r.paymentSplits?.length || r.paymentMethod) ? (
                              <div className="text-[11px] text-[#94A3B8]">
                                {formatPaymentSplitsLabel(r.paymentSplits, r.paymentMethod)}
                              </div>
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
                            {r.status === "PAID" ? (
                              <span className="inline-flex items-center h-8 px-3 text-[11px] font-medium text-[#94A3B8]">
                                Pago
                              </span>
                            ) : (
                              <FinancialPayButton
                                type={r.type}
                                disabled={!token}
                                onClick={() => openPay(r)}
                              />
                            )}
                            <button
                              type="button"
                              title="Excluir lancamento"
                              disabled={!token || deletingId === r.id}
                              onClick={() => void deleteEntry(r)}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-[#94A3B8] hover:text-[#DC2626] hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                        {expandedId === r.id && r.installments?.map((p) => (
                          <tr key={p.id} className="bg-[#F8FAFC] border-t border-[#E2E8F0]">
                            <td className="px-4 py-2 pl-8 text-[12px]">{p.description}</td>
                            <td />
                            <td className="px-4 py-2 text-[12px]">{formatDate(p.dueDate)}</td>
                            <td className="px-4 py-2 text-right text-[12px]">{formatCurrency(Number(p.amount))}</td>
                            <td className="px-4 py-2 text-right space-x-1">
                              {p.status === "OPEN" ? (
                                <FinancialPayButton type={p.type} onClick={() => openPay(p)} />
                              ) : (
                                <span className="text-[11px] text-[#94A3B8]">Pago</span>
                              )}
                              <button
                                type="button"
                                title="Excluir parcela"
                                disabled={!token || deletingId === p.id}
                                onClick={() => void deleteEntry(p)}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-[#94A3B8] hover:text-[#DC2626] hover:bg-red-50 disabled:opacity-50"
                              >
                                <Trash2 size={14} />
                              </button>
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
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 space-y-4">
              <div className="bg-white rounded-xl card-shadow overflow-hidden">
                <div className="px-5 py-3 border-b border-[#E2E8F0]">
                  <h3 className="text-[14px] font-semibold text-[#1E293B]">Receber pagamento</h3>
                  <p className="text-[12px] text-[#64748B] mt-0.5">
                    OS finalizadas ou entregues — gere o recebivel e baixe na hora
                  </p>
                </div>
                {queueLoading ? (
                  <p className="px-5 py-6 text-sm text-[#64748B]">Carregando...</p>
                ) : (
                  <>
                    {(receiveQueue?.openReceivables.length ?? 0) > 0 && (
                      <div className="px-5 py-3 border-b border-[#F1F5F9]">
                        <p className="text-[11px] font-medium uppercase text-[#94A3B8] mb-2">
                          Aguardando pagamento
                        </p>
                        <ul className="space-y-2">
                          {receiveQueue!.openReceivables.map((r) => (
                            <li
                              key={r.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#1E293B]">
                                  OS #{r.serviceOrder?.number ?? "—"}
                                  {r.customer?.name ? ` — ${r.customer.name}` : ""}
                                </p>
                                <p className="text-[12px] text-[#64748B]">{r.description}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm font-bold text-[#16A34A]">
                                  {formatCurrency(Number(r.amount))}
                                </span>
                                <FinancialPayButton
                                  type="RECEIVABLE"
                                  onClick={() => openPay(r)}
                                />
                                <button
                                  type="button"
                                  title="Excluir recebivel"
                                  disabled={!token || deletingId === r.id}
                                  onClick={() => void deleteEntry(r)}
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-[#94A3B8] hover:text-[#DC2626] hover:bg-red-50 disabled:opacity-50"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(receiveQueue?.readyToBill.length ?? 0) > 0 ? (
                      <div className="px-5 py-3">
                        <p className="text-[11px] font-medium uppercase text-[#94A3B8] mb-2">
                          OS prontas para cobrar
                        </p>
                        <ul className="space-y-2">
                          {receiveQueue!.readyToBill.map((o) => (
                            <li
                              key={o.serviceOrderId}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#1E293B]">
                                  OS #{o.number} — {o.customerName}
                                </p>
                                <p className="text-[12px] text-[#64748B]">
                                  {o.plate} · {serviceOrderStatusLabel[o.status] ?? o.status}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-sm font-bold text-[#0F3D4C]">
                                  {formatCurrency(o.totalAmount)}
                                </span>
                                <FinancialPayButton
                                  type="RECEIVABLE"
                                  label="Cobrar"
                                  loading={chargingOrderId === o.serviceOrderId}
                                  disabled={chargingOrderId === o.serviceOrderId}
                                  onClick={() => void chargeOrder(o)}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (receiveQueue?.openReceivables.length ?? 0) === 0 ? (
                      <p className="px-5 py-6 text-sm text-[#94A3B8]">
                        Nenhuma OS aguardando cobranca no momento.
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl card-shadow p-5">
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

      <PayEntryModal
        open={!!payTarget}
        entry={payTarget}
        form={payForm}
        cashOpen={!!cashSession}
        loading={pay.isPending}
        onFormChange={setPayForm}
        onConfirm={() => pay.mutate()}
        onClose={() => setPayTarget(null)}
      />

      <DeleteEntryModal
        entry={deleteTarget}
        loading={!!deletingId}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(reason) => void confirmDeleteEntry(reason)}
      />
    </>
  );
}
