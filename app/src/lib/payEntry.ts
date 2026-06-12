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
