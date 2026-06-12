import { resolveAssetUrl } from "./assetUrl";

const TAGLINE = "Studio especializado em linhas premium";

/** URLs de logo antigas — ignoradas em favor do logo do deploy. */
const LEGACY_LOGO_URLS = new Set(["/logo-wtecmotors.png"]);

/** Instância dedicada (ex.: WTEC Motors) — uma empresa por deploy. */
export const branding = {
  appName: import.meta.env.VITE_APP_NAME ?? "WTEC Motors",
  appTagline: import.meta.env.VITE_APP_TAGLINE ?? TAGLINE,
  defaultOrganizationName:
    import.meta.env.VITE_DEFAULT_ORGANIZATION_NAME ?? "WTEC Motors",
  singleTenant: import.meta.env.VITE_SINGLE_TENANT !== "false",
  /** Logo em public/logo-oficinascalibur.png */
  logoUrl: "/logo-oficinascalibur.png",
  watermarkUrl: "/logo-oficinascalibur.png",
  printContact: {
    address: "Rua Azarias de Melo, 490 - Taquaral - Campinas/SP - CEP 13076-008",
    email: "wtecmotors@gmail.com",
    instagram: "@wtecmotors",
  },
} as const;

export function resolveBrandingLogoUrl(path: string | null | undefined): string {
  const trimmed = path?.trim();
  if (!trimmed || LEGACY_LOGO_URLS.has(trimmed)) return branding.logoUrl;
  return resolveAssetUrl(trimmed) ?? branding.logoUrl;
}

export const pageTitle = `${branding.appName} - ${branding.appTagline}`;

/** Assinatura do plano (instância dedicada) */
export const subscription = {
  planName: "Profissional",
  validUntil: "30/06/2035",
  validUntilIso: "2035-06-30",
} as const;
