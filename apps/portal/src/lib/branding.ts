const TAGLINE = "Portal do Cliente";

/** Instância dedicada (ex.: WTEC Motors) — uma empresa por deploy. */
export const branding = {
  appName: import.meta.env.VITE_APP_NAME ?? "WTEC Motors",
  appTagline: import.meta.env.VITE_APP_TAGLINE ?? TAGLINE,
  defaultOrganizationName:
    import.meta.env.VITE_DEFAULT_ORGANIZATION_NAME ?? "WTEC Motors",
  singleTenant: import.meta.env.VITE_SINGLE_TENANT !== "false",
  /** Logo — troque em public/branding/logo.png ou via VITE_BRAND_LOGO_URL */
  logoUrl: import.meta.env.VITE_BRAND_LOGO_URL ?? "/branding/logo.png",
  /** Fundo — troque em public/branding/background.webp ou via VITE_BRAND_BACKGROUND_URL */
  backgroundUrl: import.meta.env.VITE_BRAND_BACKGROUND_URL ?? "/branding/background.webp",
  /** Compatibilidade com referências antigas */
  legacyLogoUrl: "/logo-wtecmotors.png",
} as const;

export const pageTitle = `${branding.appName} - ${branding.appTagline}`;

/** Assinatura do plano (instância dedicada) */
export const subscription = {
  planName: "Profissional",
  validUntil: "30/06/2035",
  validUntilIso: "2035-06-30",
} as const;
