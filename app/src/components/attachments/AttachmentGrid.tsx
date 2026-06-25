import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useAuthToken } from "../../hooks/useApiQuery";
import { api } from "../../lib/api";
import { resolveMediaUrl } from "../../lib/mediaUrl";
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

function resolveAttachmentSrc(url: string) {
  return url.startsWith("http") ? url : resolveMediaUrl(url);
}

function AttachmentTile({
  attachment,
  isDeleting,
  onDelete,
}: {
  attachment: AttachmentGridItem;
  isDeleting: boolean;
  onDelete: (id: string) => void;
}) {
  const token = useAuthToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(attachment.url?.trim() ? attachment.url : null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const loadUrl = useCallback(async () => {
    if (url || loading || failed) return;
    if (attachment.url?.trim()) {
      setUrl(attachment.url);
      return;
    }
    if (!token) return;
    setLoading(true);
    try {
      const { url: fetched } = await api.getAttachmentUrl(token, attachment.id);
      if (fetched?.trim()) {
        setUrl(fetched);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [attachment.id, attachment.url, failed, loading, token, url]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || url || failed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadUrl();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [failed, loadUrl, url]);

  const openMedia = useCallback(async () => {
    if (url) {
      window.open(resolveAttachmentSrc(url), "_blank", "noopener,noreferrer");
      return;
    }
    if (!token) return;
    setLoading(true);
    try {
      const { url: fetched } = await api.getAttachmentUrl(token, attachment.id);
      if (fetched?.trim()) {
        setUrl(fetched);
        window.open(resolveAttachmentSrc(fetched), "_blank", "noopener,noreferrer");
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [attachment.id, token, url]);

  const isImage = isImageMime(attachment.mimeType);
  const isVideo = isVideoMime(attachment.mimeType);
  const src = url ? resolveAttachmentSrc(url) : "";

  return (
    <div
      ref={containerRef}
      className="relative rounded-lg border border-[#E2E8F0] overflow-hidden bg-[#F8FAFC]"
    >
      <button
        type="button"
        title="Remover mídia"
        disabled={isDeleting}
        onClick={() => onDelete(attachment.id)}
        className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600 disabled:opacity-60"
      >
        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      </button>

      {failed ? (
        <div className="h-32 flex flex-col items-center justify-center gap-1 p-3 text-center">
          <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
            Arquivo indisponível
          </span>
          <span className="text-[10px] text-[#64748B] line-clamp-2">{attachment.fileName}</span>
          <span className="text-[10px] text-[#94A3B8]">Registro local — pode remover</span>
        </div>
      ) : loading && !url ? (
        <div className="h-32 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[#94A3B8]" />
        </div>
      ) : isImage && src ? (
        <button type="button" onClick={() => void openMedia()} className="block w-full">
          <img
            src={src}
            alt={attachment.fileName}
            loading="lazy"
            className="w-full h-32 object-cover"
          />
        </button>
      ) : isVideo && src ? (
        <video
          src={src}
          controls
          className="w-full h-32 object-cover bg-black"
          preload="metadata"
        />
      ) : isImage || isVideo ? (
        <button
          type="button"
          onClick={() => void openMedia()}
          className="h-32 w-full flex items-center justify-center text-xs text-[#64748B] p-2 text-center hover:bg-[#F1F5F9]"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : "Clique para visualizar"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void openMedia()}
          className="h-32 w-full flex items-center justify-center text-xs text-[#64748B] p-2 text-center hover:bg-[#F1F5F9]"
        >
          {attachment.fileName}
        </button>
      )}
    </div>
  );
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
      {attachments.map((attachment) => (
        <AttachmentTile
          key={attachment.id}
          attachment={attachment}
          isDeleting={deletingId === attachment.id}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
