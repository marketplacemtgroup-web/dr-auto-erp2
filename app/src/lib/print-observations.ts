export type PrintObservationBlock = {
  title: string;
  text: string;
};

/** Observações visíveis ao cliente no orçamento (quote + fallback da OS). */
export function resolveQuotePrintObservations(
  quoteNotes?: string | null,
  osNotes?: string | null,
): PrintObservationBlock[] {
  const quoteText = quoteNotes?.trim();
  const osText = osNotes?.trim();

  if (quoteText) return [{ title: "Observações do orçamento", text: quoteText }];
  if (osText) return [{ title: "Observações da oficina", text: osText }];
  return [];
}

type QuoteWithNotes = {
  number?: number | null;
  status: string;
  customerVisibleNotes?: string | null;
};

/** Observações na impressão da OS — combina notas da OS e do orçamento ativo. */
export function resolveServiceOrderPrintObservations(
  osNotes: string | null | undefined,
  quotes: QuoteWithNotes[],
): PrintObservationBlock[] {
  const osText = osNotes?.trim();
  const quoteWithNotes =
    quotes.find((q) => q.status === "PENDING" && q.customerVisibleNotes?.trim()) ??
    quotes.find((q) => q.status === "APPROVED" && q.customerVisibleNotes?.trim()) ??
    quotes.find((q) => q.customerVisibleNotes?.trim()) ??
    null;
  const quoteText = quoteWithNotes?.customerVisibleNotes?.trim();

  const blocks: PrintObservationBlock[] = [];
  if (osText) {
    blocks.push({ title: "Observações da ordem de serviço", text: osText });
  }
  if (quoteText && quoteText !== osText) {
    blocks.push({
      title: quoteWithNotes?.number
        ? `Observações do orçamento #${quoteWithNotes.number}`
        : "Observações do orçamento",
      text: quoteText,
    });
  }
  return blocks;
}
