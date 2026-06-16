const TAGLINE = "OFICINA MECÂNICA";

/** Logo oficial — único asset de marca em todo o sistema. */
export const OFFICIAL_LOGO_URL = "/logo-oficinadobeto.png";

/** Instância dedicada (ex.: OFICINA DO BETO) — uma empresa por deploy. */
export const branding = {
  appName: import.meta.env.VITE_APP_NAME ?? "OFICINA DO BETO",
  appTagline: import.meta.env.VITE_APP_TAGLINE ?? TAGLINE,
  defaultOrganizationName:
    import.meta.env.VITE_DEFAULT_ORGANIZATION_NAME ?? "OFICINA DO BETO",
  singleTenant: import.meta.env.VITE_SINGLE_TENANT !== "false",
  logoUrl: OFFICIAL_LOGO_URL,
  watermarkUrl: OFFICIAL_LOGO_URL,
  printContact: {
    address: "Rua Azarias de Melo, 490 - Taquaral - Campinas/SP - CEP 13076-008",
    email: "oficinadobeto@gmail.com",
    instagram: "@oficinadobeto",
  },
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
