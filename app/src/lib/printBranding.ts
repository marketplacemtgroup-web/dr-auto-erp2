import type { OrganizationDetail } from "./api";
import { branding } from "./branding";

/** Logo fixo do deploy — usado na impressão de orçamento e OS. */
function resolvePrintLogoUrl(): string {
  const path = branding.logoUrl;
  if (typeof window !== "undefined" && path.startsWith("/")) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export function resolvePrintBranding(org?: OrganizationDetail | null) {
  return {
    name: org?.tradeName || org?.name || branding.defaultOrganizationName,
    logoUrl: resolvePrintLogoUrl(),
    document: org?.document ?? null,
    phone: org?.phone ?? null,
    email: branding.printContact.email,
    address: branding.printContact.address,
    instagram: branding.printContact.instagram,
    footerText: org?.footerText ?? null,
  };
}
