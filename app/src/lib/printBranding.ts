import { branding } from "./branding";
import type { BranchRow, OrganizationDetail } from "./api";

/** Logo fixo do deploy — usado na impressão de orçamento e OS. */
function resolvePrintLogoUrl(): string {
  const path = branding.logoUrl;
  if (typeof window !== "undefined" && path.startsWith("/")) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export function resolvePrintBranding(org?: OrganizationDetail | null) {
  const mainBranch = org?.branches?.find((b) => b.isMain) ?? org?.branches?.[0];
  const address = resolveBranchAddress(mainBranch) ?? branding.printContact.address;

  return {
    name: org?.tradeName || org?.name || branding.defaultOrganizationName,
    logoUrl: resolvePrintLogoUrl(),
    document: org?.document ?? null,
    phone: org?.phone ?? null,
    email: branding.printContact.email,
    address,
    instagram: branding.printContact.instagram,
    footerText: org?.footerText ?? null,
  };
}

function resolveBranchAddress(branch?: BranchRow | null): string | null {
  if (!branch) return null;
  if (branch.address) return branch.address;
  const parts = [
    [branch.street, branch.addressNumber].filter(Boolean).join(", "),
    branch.district,
    branch.city && branch.state ? `${branch.city}/${branch.state}` : branch.city || branch.state,
    branch.zipCode ? `CEP ${branch.zipCode}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" - ") : null;
}
