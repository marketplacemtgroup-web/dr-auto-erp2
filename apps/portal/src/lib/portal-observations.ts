import type { PortalQuoteRow } from "./api";

export type PortalObservationSection = {
  title: string;
  text: string;
};

/** Observações visíveis ao cliente no orçamento (quote + fallback da OS). */
export function resolveQuoteObservations(quote: PortalQuoteRow): PortalObservationSection[] {
  const quoteText = quote.customerVisibleNotes?.trim();
  const osText = quote.serviceOrder.customerVisibleNotes?.trim();

  const sections: PortalObservationSection[] = [];
  if (quoteText) {
    sections.push({ title: "Observações do orçamento", text: quoteText });
  } else if (osText) {
    sections.push({ title: "Observações da oficina", text: osText });
  }
  return sections;
}

export function hasQuoteObservations(quote: PortalQuoteRow): boolean {
  return resolveQuoteObservations(quote).length > 0;
}

/** Observações na tela da OS — combina notas da OS e do orçamento ativo. */
export function resolveServiceOrderObservations(
  osNotes: string | null | undefined,
  quotes: PortalQuoteRow[],
): PortalObservationSection[] {
  const osText = osNotes?.trim();
  const quoteWithNotes =
    quotes.find((q) => q.status === "PENDING" && q.customerVisibleNotes?.trim()) ??
    quotes.find((q) => q.status === "APPROVED" && q.customerVisibleNotes?.trim()) ??
    quotes.find((q) => q.customerVisibleNotes?.trim()) ??
    null;
  const quoteText = quoteWithNotes?.customerVisibleNotes?.trim();

  const sections: PortalObservationSection[] = [];
  if (osText) {
    sections.push({ title: "Observações da ordem de serviço", text: osText });
  }
  if (quoteText && quoteText !== osText) {
    sections.push({
      title: quoteWithNotes?.number
        ? `Observações do orçamento #${quoteWithNotes.number}`
        : "Observações do orçamento",
      text: quoteText,
    });
  }
  return sections;
}

export function hasServiceOrderObservations(
  osNotes: string | null | undefined,
  quotes: PortalQuoteRow[],
): boolean {
  return resolveServiceOrderObservations(osNotes, quotes).length > 0;
}
