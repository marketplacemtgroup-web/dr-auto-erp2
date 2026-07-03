import type { PaymentMethod } from "./api";
import { PAYMENT_LABELS } from "./paymentMethods";

export type PaySplitFormRow = {
  id: string;
  paymentMethod: PaymentMethod;
  amount: string;
  registerInCash: boolean;
};

export type PayEntryFormState = {
  discountMoney: string;
  discountPercent: string;
  interestAmount: string;
  penaltyAmount: string;
  feeAmount: string;
  splits: PaySplitFormRow[];
};

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function computePayDiscount(gross: number, discountMoney: string, discountPercent: string) {
  const money = Number(discountMoney.replace(",", ".")) || 0;
  const percent = Number(discountPercent.replace(",", ".")) || 0;

  if (money > 0) {
    return roundMoney(Math.min(money, gross));
  }
  if (percent > 0) {
    return roundMoney(Math.min((gross * percent) / 100, gross));
  }
  return 0;
}

export function createDefaultPayForm(gross: number, preferCash = false): PayEntryFormState {
  const method: PaymentMethod = preferCash ? "CASH" : "PIX";
  return {
    discountMoney: "",
    discountPercent: "",
    interestAmount: "",
    penaltyAmount: "",
    feeAmount: "",
    splits: [
      {
        id: crypto.randomUUID(),
        paymentMethod: method,
        amount: gross > 0 ? gross.toFixed(2) : "",
        registerInCash: preferCash,
      },
    ],
  };
}

export function computePayNetDue(
  gross: number,
  form: PayEntryFormState,
  type: "PAYABLE" | "RECEIVABLE",
) {
  const discount = computePayDiscount(gross, form.discountMoney, form.discountPercent);
  const interest = Number(form.interestAmount.replace(",", ".")) || 0;
  const penalty = Number(form.penaltyAmount.replace(",", ".")) || 0;
  const fee = Number(form.feeAmount.replace(",", ".")) || 0;
  if (type === "PAYABLE") {
    return roundMoney(gross - discount + interest + penalty);
  }
  return roundMoney(gross - discount - fee);
}

/** Ajusta valores das formas de pagamento quando desconto/taxa alteram o liquido. */
export function syncPaySplitsToNetDue(
  form: PayEntryFormState,
  netDue: number,
): PayEntryFormState {
  if (form.splits.length === 0) return form;
  if (form.splits.length === 1) {
    return {
      ...form,
      splits: [{ ...form.splits[0], amount: netDue > 0 ? netDue.toFixed(2) : "" }],
    };
  }
  const paid = splitSum(form.splits);
  const remaining = roundMoney(netDue - paid);
  if (Math.abs(remaining) < 0.01) return form;
  const last = form.splits[form.splits.length - 1];
  const lastAmount = Number(last.amount.replace(",", ".")) || 0;
  const nextLast = roundMoney(Math.max(0, lastAmount + remaining));
  return {
    ...form,
    splits: form.splits.map((row, index) =>
      index === form.splits.length - 1
        ? { ...row, amount: nextLast > 0 ? nextLast.toFixed(2) : "" }
        : row,
    ),
  };
}

export function splitSum(splits: PaySplitFormRow[]) {
  return roundMoney(
    splits.reduce((sum, row) => sum + (Number(row.amount.replace(",", ".")) || 0), 0),
  );
}

export function formatPaymentSplitsLabel(
  splits?: Array<{ paymentMethod: PaymentMethod; amount: string | number }>,
  fallback?: PaymentMethod | null,
) {
  if (splits?.length) {
    return splits
      .map((s) => {
        const amt = Number(s.amount).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
        return `${PAYMENT_LABELS[s.paymentMethod]} ${amt}`;
      })
      .join(" + ");
  }
  return fallback ? PAYMENT_LABELS[fallback] : "";
}
