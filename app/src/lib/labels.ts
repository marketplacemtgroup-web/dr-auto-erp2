export const serviceOrderStatusLabel: Record<string, string> = {
  RECEIVED: "Recebida",
  DIAGNOSIS: "Diagnóstico",
  AWAITING_QUOTE: "Aguard. orçamento",
  AWAITING_APPROVAL: "Aguard. aprovação",
  APPROVED: "Aprovada",
  IN_PROGRESS: "Em execução",
  AWAITING_PART: "Aguard. peça",
  FINISHED: "Finalizada",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelada",
};

export const quoteStatusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

export const purchaseStatusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  ORDERED: "Pedido",
  RECEIVED: "Recebido",
  CANCELLED: "Cancelado",
};

export const financialStatusLabel: Record<string, string> = {
  OPEN: "Em aberto",
  PAID: "Pago",
  CANCELLED: "Cancelado",
};

export const serviceOrderStatuses = Object.keys(serviceOrderStatusLabel);
