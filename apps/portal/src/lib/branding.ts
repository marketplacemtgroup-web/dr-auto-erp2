const TAGLINE = "Portal do Cliente";

/** Logo oficial — único asset de marca em todo o sistema. */
export const OFFICIAL_LOGO_URL = "/logo-oficinadobeto.png";

export const DEFAULT_LOGO_URL = OFFICIAL_LOGO_URL;
export const DEFAULT_BACKGROUND_URL = OFFICIAL_LOGO_URL;

/** Instância dedicada (ex.: OFICINA DO BETO) — uma empresa por deploy. */
export const branding = {
  appName: import.meta.env.VITE_APP_NAME ?? "OFICINA DO BETO",
  appTagline: import.meta.env.VITE_APP_TAGLINE ?? TAGLINE,
  defaultOrganizationName:
    import.meta.env.VITE_DEFAULT_ORGANIZATION_NAME ?? "OFICINA DO BETO",
  singleTenant: import.meta.env.VITE_SINGLE_TENANT !== "false",
  logoUrl: DEFAULT_LOGO_URL,
  backgroundUrl: DEFAULT_BACKGROUND_URL,
  legacyLogoUrl: DEFAULT_LOGO_URL,
} as const;

export function resolveBrandingLogoUrl(_path?: string | null): string {
  return branding.logoUrl;
}

export const pageTitle = `${branding.appName} - ${branding.appTagline}`;

/** Assinatura do plano (instância dedicada) */
export const subscription = {
  planName: "Profissional",
  validUntil: "30/06/2035",
  validUntilIso: "2035-06-30",
} as const;
