const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "";

export function resolveMediaUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${API_URL}${path}`;
}

/** URL do anexo (signed URL na nuvem ou path local). */
export function attachmentFileUrl(attachment: { id: string; url?: string }) {
  if (attachment.url?.startsWith("http")) return attachment.url;
  if (attachment.url) return resolveMediaUrl(attachment.url);
  return resolveMediaUrl(`/api/attachments/${attachment.id}/file`);
}
