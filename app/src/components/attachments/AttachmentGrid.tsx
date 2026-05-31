import { Loader2, Trash2 } from "lucide-react";
import { attachmentFileUrl } from "../../lib/mediaUrl";
import { isImageMime, isVideoMime } from "../../lib/mediaTypes";

export interface AttachmentGridItem {
  id: string;
  fileName: string;
  mimeType: string;
  url?: string;
}

interface AttachmentGridProps {
  attachments: AttachmentGridItem[];
  deletingId?: string | null;
  onDelete: (id: string) => void;
  emptyLabel?: string;
}

export default function AttachmentGrid({
  attachments,
  deletingId,
  onDelete,
  emptyLabel = "Nenhuma mídia ainda.",
}: AttachmentGridProps) {
  if (attachments.length === 0) {
    return <p className="text-sm text-[#94A3B8]">{emptyLabel}</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {attachments.map((a) => {
        const unavailable = !a.url?.trim();
        const src = unavailable ? "" : attachmentFileUrl(a);
        const isImage = isImageMime(a.mimeType);
        const isVideo = isVideoMime(a.mimeType);
        const isDeleting = deletingId === a.id;

        return (
          <div
            key={a.id}
            className="relative rounded-lg border border-[#E2E8F0] overflow-hidden bg-[#F8FAFC]"
          >
            <button
              type="button"
              title="Remover mídia"
              disabled={isDeleting}
              onClick={() => onDelete(a.id)}
              className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600 disabled:opacity-60"
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>

            {unavailable ? (
              <div className="h-32 flex flex-col items-center justify-center gap-1 p-3 text-center">
                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  Arquivo indisponível
                </span>
                <span className="text-[10px] text-[#64748B] line-clamp-2">{a.fileName}</span>
                <span className="text-[10px] text-[#94A3B8]">Registro local — pode remover</span>
              </div>
            ) : isImage ? (
              <a href={src} target="_blank" rel="noreferrer" className="block">
                <img src={src} alt={a.fileName} className="w-full h-32 object-cover" />
              </a>
            ) : isVideo ? (
              <video
                src={src}
                controls
                className="w-full h-32 object-cover bg-black"
                preload="metadata"
              />
            ) : (
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="h-32 flex items-center justify-center text-xs text-[#64748B] p-2 text-center"
              >
                {a.fileName}
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
