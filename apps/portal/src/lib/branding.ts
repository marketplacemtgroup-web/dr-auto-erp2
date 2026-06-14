import { resolveAssetUrl } from "./assetUrl";

const TAGLINE = "Portal do Cliente";

export const DEFAULT_LOGO_URL = "/logo-oficinascalibur.png";

/** URLs de logo antigas — ignoradas em favor do logo do deploy. */
const LEGACY_LOGO_URLS = new Set(["/logo-wtecmotors.png", "/branding/logo.png"]);

/** Instância dedicada (ex.: WTEC Motors) — uma empresa por deploy. */
export const branding = {
  appName: import.meta.env.VITE_APP_NAME ?? "WTEC Motors",
  appTagline: import.meta.env.VITE_APP_TAGLINE ?? TAGLINE,
  defaultOrganizationName:
    import.meta.env.VITE_DEFAULT_ORGANIZATION_NAME ?? "WTEC Motors",
  singleTenant: import.meta.env.VITE_SINGLE_TENANT !== "false",
  /** Logo em public/logo-oficinascalibur.png */
  logoUrl: DEFAULT_LOGO_URL,
  /** Fundo — troque em public/branding/background.webp ou via VITE_BRAND_BACKGROUND_URL */
  backgroundUrl: import.meta.env.VITE_BRAND_BACKGROUND_URL ?? "/branding/background.webp",
  /** Compatibilidade com referências antigas */
  legacyLogoUrl: DEFAULT_LOGO_URL,
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
