/** Instância dedicada (ex.: Scalibur Oficinas) — uma empresa por deploy. */
export const branding = {
  appName: import.meta.env.VITE_APP_NAME ?? "Scalibur",
  appTagline: import.meta.env.VITE_APP_TAGLINE ?? "Oficina",
  defaultOrganizationName:
    import.meta.env.VITE_DEFAULT_ORGANIZATION_NAME ?? "Scalibur Oficinas",
  singleTenant: import.meta.env.VITE_SINGLE_TENANT !== "false",
} as const;

export const pageTitle = `${branding.appName} - ${branding.appTagline}`;

/** Assinatura do plano (instância dedicada) */
export const subscription = {
  planName: "Profissional",
  validUntil: "30/06/2035",
  validUntilIso: "2035-06-30",
} as const;
