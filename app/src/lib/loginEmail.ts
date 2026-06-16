export function suggestLoginEmailDomain(organizationName: string): string {
  const base = organizationName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 30);
  return base ? `${base}.local` : "oficina.local";
}

export function formatLoginPreview(username: string, domain: string): string {
  const u = username.trim().toLowerCase().replace(/\s+/g, ".");
  return u && domain ? `${u}@${domain}` : "";
}
