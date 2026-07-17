import { api, type AttachmentRow } from "./api";
import { resolveMediaUrl } from "./mediaUrl";

export function isPrintImageAttachment(attachment: Pick<AttachmentRow, "mimeType">) {
  return (attachment.mimeType ?? "").startsWith("image/");
}

/** Resolve URLs assinadas para impressão (img não envia Bearer no /file). */
export async function resolvePrintImageUrls(
  token: string,
  attachments: Array<Pick<AttachmentRow, "id" | "url" | "mimeType">>,
): Promise<Record<string, string>> {
  const images = attachments.filter(isPrintImageAttachment);
  const entries = await Promise.all(
    images.map(async (attachment) => {
      const existing = attachment.url?.trim();
      if (existing?.startsWith("http")) return [attachment.id, existing] as const;
      if (existing) return [attachment.id, resolveMediaUrl(existing)] as const;
      try {
        const { url } = await api.getAttachmentUrl(token, attachment.id);
        const resolved = url?.trim();
        if (!resolved) return null;
        return [
          attachment.id,
          resolved.startsWith("http") ? resolved : resolveMediaUrl(resolved),
        ] as const;
      } catch {
        return null;
      }
    }),
  );

  const map: Record<string, string> = {};
  for (const entry of entries) {
    if (entry) map[entry[0]] = entry[1];
  }
  return map;
}

export function partitionServiceOrderItems<T extends { itemType: string }>(items: T[]) {
  const services: T[] = [];
  const parts: T[] = [];
  for (const item of items) {
    if (item.itemType === "PART") parts.push(item);
    else services.push(item);
  }
  return { services, parts };
}
