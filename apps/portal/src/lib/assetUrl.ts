function apiBase(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";
  if (!raw) return "";

  const candidates = raw
    .split(",")
    .map((part) => part.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return (
    candidates.find((url) => /api/i.test(url)) ??
    candidates[candidates.length - 1] ??
    ""
  );
}

function isFrontendPublicAsset(path: string): boolean {
  return (
    path.startsWith("/logo-") ||
    path.startsWith("/favicon") ||
    path.startsWith("/branding/logo") ||
    path.startsWith("/pwa-")
  );
}

export function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (isFrontendPublicAsset(path)) return path;
  const base = apiBase();
  if (base) return `${base}${path}`;
  return path;
}
