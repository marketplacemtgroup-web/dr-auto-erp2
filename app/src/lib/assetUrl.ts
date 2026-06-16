function apiBase(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";
  if (!raw) return "";

  const candidates = raw
    .split(",")
    .map((part) => part.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const fromEnv =
    candidates.length <= 1
      ? candidates[0] ?? ""
      : (candidates.find((url) => /api/i.test(url)) ??
          candidates.find(
            (url) =>
              typeof window !== "undefined" && !url.startsWith(window.location.origin),
          ) ??
          candidates[candidates.length - 1] ??
          "");

  if (!fromEnv) return "";
  if (typeof window === "undefined") return fromEnv;
  const pointsToLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(fromEnv);
  const onLocalhost =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (pointsToLocalhost && !onLocalhost) return "";
  return fromEnv;
}

/** Arquivos servidos pelo frontend (public/), não pela API. */
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
