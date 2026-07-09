import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, X } from "lucide-react";
import type { FinancialAccountRow, FinancialEntryRow } from "../../lib/api";
import {
  computePayDiscount,
  computePayNetDue,
  roundMoney,
  splitSum,
  syncPaySplitsToNetDue,
  type PayEntryFormState,
} from "../../lib/payEntry";
import { PAYMENT_LABELS, PAYMENT_METHODS } from "../../lib/paymentMethods";

type Props = {
  open: boolean;
  entry: FinancialEntryRow | null;
  form: PayEntryFormState;
  accounts: FinancialAccountRow[];
  cashOpen: boolean;
  loading?: boolean;
  onFormChange: (form: PayEntryFormState) => void;
  onConfirm: () => void;
  onClose: () => void;
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PayEntryModal({
  open,
  entry,
  form,
  accounts,
  cashOpen,
  loading,
  onFormChange,
  onConfirm,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !entry) return null;

  const entryType = entry.type;
  const isReceivable = entryType === "RECEIVABLE";
  const gross = Number(entry.amount);
  const alreadyPaid = Number(entry.amountPaid ?? 0);
  const discount = computePayDiscount(gross, form.discountMoney, form.discountPercent);
  const fee = Number(form.feeAmount.replace(",", ".")) || 0;
  const netDue = computePayNetDue(gross, form, entryType);
  const remainingDue = roundMoney(Math.max(netDue - alreadyPaid, 0));
  const payTarget = Number(form.amountToPay.replace(",", ".")) || remainingDue;
  const paid = splitSum(form.splits);
  const remaining = roundMoney(payTarget - paid);
  const balanced = Math.abs(remaining) < 0.01 && payTarget > 0;

  function applyFormChange(next: PayEntryFormState, syncSplits = false) {
    if (!syncSplits) {
      onFormChange(next);
      return;
    }
    const nextNet = computePayNetDue(gross, next, entryType);
    const nextRemaining = roundMoney(Math.max(nextNet - alreadyPaid, 0));
    onFormChange(syncPaySplitsToNetDue(next, nextRemaining));
  }

  function updateSplit(id: string, patch: Partial<PayEntryFormState["splits"][0]>) {
    applyFormChange({
      ...form,
      splits: form.splits.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    });
  }

  function addSplit() {
    applyFormChange({
      ...form,
      splits: [
        ...form.splits,
        {
          id: crypto.randomUUID(),
          paymentMethod: "PIX",
          amount: remaining > 0 ? remaining.toFixed(2) : "",
          accountId: form.accountId,
          registerInCash: false,
        },
      ],
    });
  }

  function removeSplit(id: string) {
    if (form.splits.length <= 1) return;
    applyFormChange({
      ...form,
      splits: form.splits.filter((row) => row.id !== id),
    });
  }

  function setDiscountMoney(value: string) {
    applyFormChange(
      {
        ...form,
        discountMoney: value,
        discountPercent: value ? "" : form.discountPercent,
      },
      true,
    );
  }

  function setDiscountPercent(value: string) {
    applyFormChange(
      {
        ...form,
        discountPercent: value,
        discountMoney: value ? "" : form.discountMoney,
      },
      true,
    );
  }

  function setFeeAmount(value: string) {
    applyFormChange({ ...form, feeAmount: value }, true);
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-lg max-h-[min(88vh,720px)] flex flex-col bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-entry-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] shrink-0">
          <div>
            <h3 id="pay-entry-title" className="text-[16px] font-semibold text-[#1E293B]">
              {isReceivable ? "Receber pagamento" : "Baixar lancamento"}
            </h3>
            <p className="text-[12px] text-[#64748B] mt-0.5">{entry.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:bg-white hover:text-[#64748B]"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {(entry.serviceOrder || entry.customer || entry.purchaseOrder || entry.supplier) && (
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-[13px]">
              {entry.serviceOrder ? (
                <p className="font-semibold text-[#1E293B]">OS #{entry.serviceOrder.number}</p>
              ) : null}
              {entry.purchaseOrder ? (
                <p className="font-semibold text-[#1E293B]">Compra {entry.purchaseOrder.number}</p>
              ) : null}
              {entry.supplier ? (
                <p className="text-[#64748B] mt-0.5">
                  {entry.supplier.tradeName || entry.supplier.legalName}
                </p>
              ) : null}
              {entry.customer?.name ? (
                <p className="text-[#64748B] mt-0.5">{entry.customer.name}</p>
              ) : null}
            </div>
          )}

          <div className="text-center py-1">
            <p className="text-[11px] uppercase tracking-wide text-[#94A3B8] mb-1">Valor bruto</p>
            <p className="text-2xl font-bold text-[#0F3D4C]">{formatCurrency(gross)}</p>
            {alreadyPaid > 0 ? (
              <p className="text-[12px] text-[#64748B] mt-1">
                Já pago: {formatCurrency(alreadyPaid)} · Restante: {formatCurrency(remainingDue)}
              </p>
            ) : null}
            {(discount > 0 || fee > 0) && (
              <div className="text-[13px] mt-1 space-y-0.5">
                {discount > 0 ? (
                  <p className="text-[#16A34A]">Desconto {formatCurrency(discount)}</p>
                ) : null}
                {fee > 0 ? (
                  <p className="text-[#DC2626]">Taxa cartao {formatCurrency(fee)}</p>
                ) : null}
                <p className="font-semibold text-[#0F3D4C]">
                  Liquido {formatCurrency(netDue)}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#64748B] mb-1.5 block">Valor desta baixa (R$)</label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                max={remainingDue}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
                value={form.amountToPay}
                onChange={(e) => {
                  const next = { ...form, amountToPay: e.target.value };
                  onFormChange(syncPaySplitsToNetDue(next, Number(e.target.value.replace(",", ".")) || remainingDue));
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#64748B] mb-1.5 block">Conta financeira</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
                value={form.accountId}
                onChange={(e) =>
                  onFormChange({
                    ...form,
                    accountId: e.target.value,
                    splits: form.splits.map((s) => ({ ...s, accountId: e.target.value })),
                  })
                }
              >
                <option value="">Caixa principal</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#64748B] mb-1.5 block">
                Desconto (R$)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
                placeholder="0,00"
                value={form.discountMoney}
                onChange={(e) => setDiscountMoney(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#64748B] mb-1.5 block">
                Desconto (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
                placeholder="0"
                value={form.discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            </div>
          </div>

          {!isReceivable ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#64748B] mb-1.5 block">Juros (R$)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
                  value={form.interestAmount}
                  onChange={(e) => onFormChange({ ...form, interestAmount: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#64748B] mb-1.5 block">Multa (R$)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
                  value={form.penaltyAmount}
                  onChange={(e) => onFormChange({ ...form, penaltyAmount: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-[#64748B] mb-1.5 block">
                Taxa cartão (R$)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
                value={form.feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-[#64748B]">Pagamento dividido</p>
              <button
                type="button"
                onClick={addSplit}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0E7490] hover:text-[#0F3D4C]"
              >
                <Plus size={14} />
                Adicionar forma
              </button>
            </div>

            <div className="space-y-3">
              {form.splits.map((row, index) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-[#E2E8F0] p-3 space-y-2.5 bg-[#FAFAFA]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase text-[#94A3B8]">
                      Forma {index + 1}
                    </span>
                    {form.splits.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeSplit(row.id)}
                        className="p-1 rounded text-[#94A3B8] hover:text-[#DC2626] hover:bg-white"
                        aria-label="Remover forma"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {PAYMENT_METHODS.map((method) => {
                      const active = row.paymentMethod === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() =>
                            updateSplit(row.id, {
                              paymentMethod: method,
                              registerInCash:
                                method === "CASH" ? cashOpen && row.registerInCash : false,
                            })
                          }
                          className={`h-9 rounded-lg border text-[11px] font-medium transition-colors ${
                            active
                              ? "border-[#0E7490] bg-[#ECFEFF] text-[#0E7490]"
                              : "border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] bg-white"
                          }`}
                        >
                          {PAYMENT_LABELS[method]}
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <label className="text-[11px] text-[#64748B] mb-1 block">Valor (R$)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm bg-white"
                      value={row.amount}
                      onChange={(e) => updateSplit(row.id, { amount: e.target.value })}
                    />
                  </div>

                  {(isReceivable || !isReceivable) && row.paymentMethod === "CASH" ? (
                    cashOpen ? (
                      <label className="flex items-center gap-2 text-[12px] text-[#64748B]">
                        <input
                          type="checkbox"
                          checked={row.registerInCash}
                          onChange={(e) =>
                            updateSplit(row.id, { registerInCash: e.target.checked })
                          }
                        />
                        {isReceivable ? "Registrar na gaveta do caixa" : "Registrar saída no caixa"}
                      </label>
                    ) : (
                      <p className="text-[11px] text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-2.5 py-1.5">
                        Caixa fechado — nao movimenta a gaveta. Abra o caixa na aba Caixa.
                      </p>
                    )
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div
            className={`rounded-lg px-3 py-2.5 text-[13px] border ${
              balanced
                ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]"
                : "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]"
            }`}
          >
            {balanced ? (
              <span>Total informado: {formatCurrency(paid)} — valor conferido.</span>
            ) : (
              <span>
                Falta {formatCurrency(Math.max(remaining, 0))}
                {remaining < -0.01 ? ` (excesso de ${formatCurrency(Math.abs(remaining))})` : ""}{" "}
                para fechar {formatCurrency(payTarget)}.
              </span>
            )}
          </div>

          {isReceivable ? (
            <p className="text-[11px] text-[#94A3B8]">
              Voce pode dividir entre PIX, cartao, dinheiro e outras formas. Apenas o valor em
              dinheiro marcado na gaveta movimenta o caixa fisico.
            </p>
          ) : null}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-[#E2E8F0] bg-[#FAFAFA] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#64748B] hover:bg-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !balanced}
            className="flex-1 h-11 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Processando..." : isReceivable ? "Confirmar recebimento" : "Confirmar baixa"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
