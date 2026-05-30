import type { StatusVariant } from "../components/StatusBadge";

const map: Record<string, StatusVariant> = {
  IN_PROGRESS: "execucao",
  AWAITING_PART: "aguardando-peca",
  PAUSED: "pendente",
  AWAITING_PAYMENT: "aguardando-aprovacao",
  DIAGNOSIS: "diagnostico",
  AWAITING_APPROVAL: "aguardando-aprovacao",
  RECEIVED: "pendente",
  AWAITING_QUOTE: "pendente",
  APPROVED: "confirmado",
  FINISHED: "confirmado",
  DELIVERED: "confirmado",
  CANCELLED: "atrasado",
};

export function osStatusToVariant(status: string): StatusVariant {
  return map[status] ?? "pendente";
}

export function osStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    RECEIVED: "Recebido",
    DIAGNOSIS: "Diagnostico",
    AWAITING_QUOTE: "Aguardando orcamento",
    AWAITING_APPROVAL: "Aguardando aprovacao",
    APPROVED: "Aprovado",
    IN_PROGRESS: "Em execucao",
    AWAITING_PART: "Aguardando peca",
    PAUSED: "Pausada",
    AWAITING_PAYMENT: "Aguardando pagamento",
    FINISHED: "Finalizado",
    DELIVERED: "Entregue",
    CANCELLED: "Cancelado",
  };
  return labels[status] ?? status;
}

export function quoteStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Rascunho",
    PENDING: "Pendente",
    APPROVED: "Aprovado",
    REJECTED: "Recusado",
  };
  return labels[status] ?? status;
}

export function quoteStatusVariant(status: string): StatusVariant {
  if (status === "APPROVED") return "confirmado";
  if (status === "REJECTED") return "atrasado";
  if (status === "PENDING") return "aguardando-aprovacao";
  return "pendente";
}
