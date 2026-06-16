import type { OrganizationDetail } from "./api";
import { branding } from "./branding";
import { resolveAddressDisplay } from "./address";

/** Logo fixo do deploy — usado na impressão de orçamento e OS. */
function resolvePrintLogoUrl(): string {
  const path = branding.logoUrl;
  if (typeof window !== "undefined" && path.startsWith("/")) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

function mainBranch(org?: OrganizationDetail | null) {
  return org?.branches?.find((b) => b.isMain) ?? org?.branches?.[0];
}

export function resolvePrintBranding(org?: OrganizationDetail | null) {
  const branch = mainBranch(org);
  const address =
    resolveAddressDisplay(branch ?? {}) || branding.printContact.address;

  return {
    name: org?.tradeName || org?.name || branding.defaultOrganizationName,
    logoUrl: resolvePrintLogoUrl(),
    document: org?.document ?? null,
    phone: org?.phone ?? null,
    email: org?.email ?? branding.printContact.email,
    address,
    instagram: branding.printContact.instagram,
    footerText: org?.footerText ?? null,
  };
}
