const TAGLINE = "Studio especializado em linhas premium";

/** URLs de logo antigas — ignoradas em favor do logo do deploy. */
const LEGACY_LOGO_URLS = new Set(["/logo-wtecmotors.png", "/branding/logo.png"]);

/** Instância dedicada — uma empresa por deploy. */
export const branding = {
  appName: import.meta.env.VITE_APP_NAME ?? "OFICINA DO BETO",
  appTagline: import.meta.env.VITE_APP_TAGLINE ?? TAGLINE,
  defaultOrganizationName:
    import.meta.env.VITE_DEFAULT_ORGANIZATION_NAME ?? "OFICINA DO BETO",
  singleTenant: import.meta.env.VITE_SINGLE_TENANT !== "false",
  /** Logo em public/logo-oficinadobeto.png */
  logoUrl: "/logo-oficinadobeto.png",
  watermarkUrl: "/logo-oficinadobeto.png",
  printContact: {
    address: "",
    email: "oficinadobeto@gmail.com",
    instagram: "",
  },
  /** WhatsApp da oficina — links de compartilhamento e portal */
  contactWhatsApp:
    (import.meta.env.VITE_CONTACT_WHATSAPP as string | undefined)?.trim() || "",
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
