const TAGLINE = "Portal do Cliente";

export const DEFAULT_LOGO_URL = "/logo-oficinascalibur.png";
export const DEFAULT_BACKGROUND_URL = "/oficina-scalibur.png";

/** URLs de logo antigas — ignoradas em favor do logo do deploy. */
const LEGACY_LOGO_URLS = new Set(["/logo-wtecmotors.png", "/branding/logo.png"]);

/** Instância dedicada — uma empresa por deploy. */
export const branding = {
  appName: import.meta.env.VITE_APP_NAME ?? "OFICINA DO BETO",
  appTagline: import.meta.env.VITE_APP_TAGLINE ?? TAGLINE,
  defaultOrganizationName:
    import.meta.env.VITE_DEFAULT_ORGANIZATION_NAME ?? "OFICINA DO BETO",
  singleTenant: import.meta.env.VITE_SINGLE_TENANT !== "false",
  /** Logo em public/logo-oficinascalibur.png */
  logoUrl: DEFAULT_LOGO_URL,
  /** Fundo em public/oficina-scalibur.png */
  backgroundUrl: DEFAULT_BACKGROUND_URL,
  /** Compatibilidade com referências antigas */
  legacyLogoUrl: DEFAULT_LOGO_URL,
  /** WhatsApp da oficina (VITE_CONTACT_WHATSAPP no deploy). */
  contactWhatsApp:
    (import.meta.env.VITE_CONTACT_WHATSAPP as string | undefined)?.trim() || "",
  /** Horário exibido na página Suporte do portal. */
  businessHours: [
    "Segunda a Sexta: 08:00 às 18:00",
    "Almoço: 12:00 às 13:00",
    "Finais de semana: não abre.",
  ].join("\n"),
} as const;

export function resolveBrandingLogoUrl(path: string | null | undefined): string {
  const trimmed = path?.trim();
  if (!trimmed || LEGACY_LOGO_URLS.has(trimmed)) return branding.logoUrl;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/api/")) return trimmed;
  return branding.logoUrl;
}

export const pageTitle = `${branding.appName} - ${branding.appTagline}`;

/** Assinatura do plano (instância dedicada) */
export const subscription = {
  planName: "Profissional",
  validUntil: "30/06/2035",
  validUntilIso: "2035-06-30",
} as const;
