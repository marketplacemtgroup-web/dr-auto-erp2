import type { PortalQuoteRow } from "./api";

export type PortalObservationSection = {
  title: string;
  text: string;
};

/** Observações visíveis ao cliente no orçamento (vêm da OS no payload do portal). */
export function resolveQuoteObservations(quote: PortalQuoteRow): PortalObservationSection[] {
  const text = quote.serviceOrder.customerVisibleNotes?.trim();
  if (text) {
    return [{ title: "Observações da oficina", text }];
  }
  return [];
}

export function hasQuoteObservations(quote: PortalQuoteRow): boolean {
  return resolveQuoteObservations(quote).length > 0;
}

/** Observações na tela da OS — notas da OS (quotes reusam o mesmo campo no portal). */
export function resolveServiceOrderObservations(
  osNotes: string | null | undefined,
  _quotes: PortalQuoteRow[],
): PortalObservationSection[] {
  const osText = osNotes?.trim();
  if (osText) {
    return [{ title: "Observações da ordem de serviço", text: osText }];
  }
  return [];
}

export function hasServiceOrderObservations(
  osNotes: string | null | undefined,
  quotes: PortalQuoteRow[],
): boolean {
  return resolveServiceOrderObservations(osNotes, quotes).length > 0;
}
