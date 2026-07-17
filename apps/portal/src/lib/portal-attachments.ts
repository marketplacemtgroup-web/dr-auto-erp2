import type { PortalPhoto } from "./api";
import { isImageMime, isVideoMime } from "./mediaTypes";

/** Converte anexos públicos do orçamento em galeria do portal. */
export function attachmentsToPortalPhotos(
  attachments: Array<{ id: string; fileName: string; mimeType: string; url: string }>,
): PortalPhoto[] {
  return attachments
    .filter((a) => isImageMime(a.mimeType) || isVideoMime(a.mimeType))
    .map((a, index) => ({
      order: index + 1,
      label: a.fileName || `Foto ${index + 1}`,
      description: null,
      result: null,
      attachmentId: a.id,
      url: a.url,
      mimeType: a.mimeType,
      source: "media" as const,
      createdAt: new Date().toISOString(),
    }));
}
