function apiBase(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";
  if (!fromEnv) return "";
  if (typeof window === "undefined") return fromEnv.replace(/\/$/, "");
  const pointsToLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(fromEnv);
  const onLocalhost =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (pointsToLocalhost && !onLocalhost) return "";
  return fromEnv.replace(/\/$/, "");
}

export function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const base = apiBase();
  if (base) return `${base}${path}`;
  return path;
}
