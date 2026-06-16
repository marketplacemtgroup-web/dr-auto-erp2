import { branding } from "./branding";

export function whatsappUrl(phone: string, message?: string) {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${withCountry}${text}`;
}

/** Telefone/WhatsApp da oficina — env do deploy ou telefone cadastrado na organização. */
export function resolveOrganizationWhatsApp(orgPhone?: string | null): string {
  const configured = branding.contactWhatsApp.trim();
  if (configured) return configured;
  const digits = orgPhone?.replace(/\D/g, "") ?? "";
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function formatBrazilPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const national = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  if (national.length === 11) {
    return `+55 (${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`;
  }
  if (national.length === 10) {
    return `+55 (${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`;
  }
  return phone.startsWith("+") ? phone : digits ? `+${digits}` : phone;
}
