import type { OrganizationDetail } from "./api";
import { resolveAssetUrl } from "./assetUrl";
import { branding } from "./branding";

export function resolvePrintBranding(org?: OrganizationDetail | null) {
  return {
    name: org?.tradeName || org?.name || branding.defaultOrganizationName,
    logoUrl: resolveAssetUrl(org?.logoUrl) || branding.logoUrl,
    document: org?.document ?? null,
    phone: org?.phone ?? null,
    email: branding.printContact.email,
    address: branding.printContact.address,
    instagram: branding.printContact.instagram,
    footerText: org?.footerText ?? null,
  };
}
