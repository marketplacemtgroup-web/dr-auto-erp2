const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "";

export function resolveMediaUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${API_URL}${path}`;
}
