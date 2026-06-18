import type { QuoteLineRow } from "./api";
import { quoteNeedsResponse } from "./quote-lines";

const FINISHED_STATUSES = new Set(["FINISHED", "DELIVERED", "CANCELLED"]);

export function isFinished(status: string): boolean {
  return FINISHED_STATUSES.has(status.toUpperCase());
}

export function isInProgress(status: string): boolean {
  return !isFinished(status);
}

export function isAwaitingApproval(status: string): boolean {
  return status.toUpperCase() === "AWAITING_APPROVAL";
}

export function hasPendingQuote(
  quotes: Array<{
    status: string;
    canRespond?: boolean;
    lines?: QuoteLineRow[];
    serviceOrder: { id: string };
  }>,
  serviceOrderId: string,
): boolean {
  return quotes.some(
    (q) => q.serviceOrder.id === serviceOrderId && quoteNeedsResponse(q),
  );
}
