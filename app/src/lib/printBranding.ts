import type { OrganizationDetail } from "./api";
import { branding, resolveBrandingLogoUrl } from "./branding";

export function resolvePrintBranding(org?: OrganizationDetail | null) {
  return {
    name: org?.tradeName || org?.name || branding.defaultOrganizationName,
    logoUrl: resolveBrandingLogoUrl(org?.logoUrl),
    document: org?.document ?? null,
    phone: org?.phone ?? null,
    email: branding.printContact.email,
    address: branding.printContact.address,
    instagram: branding.printContact.instagram,
    footerText: org?.footerText ?? null,
  };
}
