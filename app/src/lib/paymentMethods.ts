import type { PaymentMethod } from "./api";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CARD: "Cartão",
  BOLETO: "Boleto",
  TRANSFER: "Transferência",
  OTHER: "Outro",
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  "PIX",
  "CASH",
  "CARD",
  "TRANSFER",
  "BOLETO",
  "OTHER",
];
