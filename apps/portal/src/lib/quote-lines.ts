import type { QuoteLineRow } from "./api";

export function quoteLineTotal(line: QuoteLineRow) {
  return Number(line.unitPrice) * line.quantity - Number(line.discount ?? 0);
}

export function sumQuoteLines(lines: QuoteLineRow[]) {
  return lines.reduce((sum, line) => sum + quoteLineTotal(line), 0);
}

export type QuoteLineGroup = {
  key: "SERVICE" | "PART" | "SCANNER" | "THIRD_PARTY";
  label: string;
  lines: QuoteLineRow[];
  subtotal: number;
};

export function groupQuoteLines(lines: QuoteLineRow[]): QuoteLineGroup[] {
  const groups: QuoteLineGroup[] = [
    { key: "SERVICE", label: "Serviços", lines: [], subtotal: 0 },
    { key: "PART", label: "Peças", lines: [], subtotal: 0 },
    { key: "SCANNER", label: "Scanner", lines: [], subtotal: 0 },
    { key: "THIRD_PARTY", label: "Terceirizado", lines: [], subtotal: 0 },
  ];

  for (const line of lines) {
    const group =
      line.lineType === "PART"
        ? groups[1]
        : line.lineType === "SCANNER"
          ? groups[2]
          : line.lineType === "THIRD_PARTY"
            ? groups[3]
            : groups[0];
    group.lines.push(line);
    group.subtotal += quoteLineTotal(line);
  }

  return groups.filter((g) => g.lines.length > 0);
}

export function pendingQuoteLines(lines: QuoteLineRow[]) {
  return lines.filter((line) => line.approved === null);
}

export function approvedQuoteLines(lines: QuoteLineRow[]) {
  return lines.filter((line) => line.approved === true);
}

export function isSupplementQuote(lines: QuoteLineRow[]) {
  return approvedQuoteLines(lines).length > 0 && pendingQuoteLines(lines).length > 0;
}

/** Orçamento ainda exige resposta do cliente (linhas pendentes + status aberto). */
export function quoteNeedsResponse(quote: {
  status: string;
  canRespond?: boolean;
  lines?: QuoteLineRow[];
  freeTextEnabled?: boolean;
  freeTextAmount?: string | number | null;
  amount?: number | string;
}) {
  if (quote.status === "APPROVED" || quote.status === "REJECTED" || quote.status === "DRAFT") {
    return false;
  }
  if (quote.canRespond === true) return true;
  if (quote.canRespond === false) return false;
  const pending = pendingQuoteLines(quote.lines ?? []);
  if (pending.length === 0) {
    return (
      quote.status === "PENDING" &&
      !!quote.freeTextEnabled &&
      Number(quote.freeTextAmount ?? quote.amount ?? 0) > 0
    );
  }
  return quote.status === "PENDING";
}

/** Aprova todas as linhas pendentes (ou todas, se não houver pendência explícita). */
export function buildApprovePayload(lines: QuoteLineRow[]) {
  const pending = pendingQuoteLines(lines);
  const target = pending.length > 0 ? pending : lines;
  if (target.length === 0) return undefined;
  return {
    lines: target.map((line) => ({
      lineId: line.id,
      approved: true,
    })),
  };
}
