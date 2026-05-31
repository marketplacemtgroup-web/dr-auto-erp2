import type { StatusVariant } from "../components/StatusBadge";

const STATUS_MAP: Record<string, StatusVariant> = {
  RECEIVED: "pendente",
  DIAGNOSIS: "diagnostico",
  AWAITING_QUOTE: "pendente",
  AWAITING_APPROVAL: "aguardando-aprovacao",
  APPROVED: "confirmado",
  IN_PROGRESS: "execucao",
  AWAITING_PART: "aguardando-peca",
  FINISHED: "confirmado",
  DELIVERED: "confirmado",
  CANCELLED: "pendente",
};

export function serviceOrderStatusToVariant(status: string): StatusVariant {
  return STATUS_MAP[status] ?? "pendente";
}
