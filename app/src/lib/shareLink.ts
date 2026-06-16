import { branding } from "./branding";

/** Normaliza telefone BR para wa.me (somente dígitos, com DDI 55). */
export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length < 10) return null;
  if (!digits.startsWith("55")) digits = `55${digits}`;
  return digits;
}

/** Telefone da oficina para wa.me em compartilhamentos e portal. */
export function resolveOrganizationWhatsApp(organizationPhone?: string | null): string {
  const configured = normalizeWhatsAppPhone(branding.contactWhatsApp);
  if (configured) return configured;
  return normalizeWhatsAppPhone(organizationPhone) ?? "";
}

export function whatsAppShareUrl(message: string, phone?: string | null) {
  const text = encodeURIComponent(message);
  const normalized = phone ? normalizeWhatsAppPhone(phone) : null;
  if (normalized) return `https://wa.me/${normalized}?text=${text}`;
  return `https://wa.me/?text=${text}`;
}

export function applyUrlTemplate(template: string, url: string) {
  return template.replace(/\{url\}/g, url);
}

export function defaultQuoteWhatsAppMessage(opts: {
  customerName?: string | null;
  plate?: string | null;
  quoteNumber?: number | null;
  url: string;
}) {
  const name = opts.customerName?.trim();
  const plate = opts.plate?.trim();
  const num = opts.quoteNumber ? ` #${opts.quoteNumber}` : "";
  const greeting = name ? `Olá, ${name}!` : "Olá!";
  const vehicle = plate ? ` do veículo ${plate}` : "";
  return `${greeting} Segue o orçamento${num}${vehicle} da oficina:\n${opts.url}\n\nAbra o link para ver os itens, aprovar ou salvar em PDF (Imprimir no celular).`;
}

export function defaultPortalWhatsAppMessage(opts: {
  customerName?: string | null;
  plate?: string | null;
  url: string;
}) {
  const name = opts.customerName?.trim();
  const plate = opts.plate?.trim();
  const greeting = name ? `Olá, ${name}!` : "Olá!";
  const vehicle = plate ? ` ${plate}` : " seu veículo";
  return `${greeting} Acompanhe${vehicle} pela oficina:\n${opts.url}`;
}
