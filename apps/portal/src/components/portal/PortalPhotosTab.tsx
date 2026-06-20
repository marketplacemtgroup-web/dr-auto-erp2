import { useState } from "react";
import { AlertTriangle, CheckCircle2, ImageIcon, MinusCircle, XCircle } from "lucide-react";
import type { PortalPhoto } from "../../lib/api";
import {
  CHECKLIST_RESULT_LABELS,
  checklistResultVariant,
  type ChecklistResult,
} from "../../lib/checklist";
import { resolveMediaUrl } from "../../lib/mediaUrl";
import { isImageMime, isVideoMime } from "../../lib/mediaTypes";

const PAGE_SIZE = 30;

function ResultIcon({ result }: { result: ChecklistResult | null }) {
  if (result === "OK") return <CheckCircle2 size={16} className="text-green-600 shrink-0" />;
  if (result === "ATTENTION") return <AlertTriangle size={16} className="text-amber-600 shrink-0" />;
  if (result === "DAMAGED") return <XCircle size={16} className="text-red-600 shrink-0" />;
  return <MinusCircle size={16} className="text-[#94A3B8] shrink-0" />;
}

function resultBadgeClass(result: ChecklistResult | null) {
  const variant = checklistResultVariant(result ?? undefined);
  if (variant === "success") return "bg-green-50 text-green-800 border-green-200";
  if (variant === "warning") return "bg-amber-50 text-amber-900 border-amber-200";
  if (variant === "danger") return "bg-red-50 text-red-800 border-red-200";
  return "bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]";
}

export default function PortalPhotosTab({ photos }: { photos: PortalPhoto[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (photos.length === 0) {
    return (
      <section className="portal-card p-6 text-center">
        <ImageIcon className="mx-auto mb-3 portal-text-muted" size={32} />
        <p className="text-sm portal-text-muted">A oficina ainda não enviou fotos desta OS</p>
      </section>
    );
  }

  const visiblePhotos = photos.slice(0, visibleCount);
  const hasMore = visibleCount < photos.length;

  return (
    <section className="space-y-3">
      <p className="text-xs portal-text-muted px-1">
        {photos.length} {photos.length === 1 ? "registro" : "registros"} — sequência da vistoria e mídia da oficina.
      </p>

      <ul className="space-y-3">
        {visiblePhotos.map((photo) => {
          const src = resolveMediaUrl(photo.url);
          const isImage = isImageMime(photo.mimeType);
          const isVideo = isVideoMime(photo.mimeType);
          const resultLabel = photo.result ? CHECKLIST_RESULT_LABELS[photo.result] : null;

          return (
            <li
              key={`${photo.order}-${photo.url}`}
              className="portal-card overflow-hidden"
            >
              <div className="flex gap-3 p-4">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: "var(--portal-primary)" }}
                >
                  {photo.order}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold portal-text">{photo.label}</p>
                    {photo.source === "checklist" && photo.result ? (
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${resultBadgeClass(photo.result)}`}
                      >
                        <ResultIcon result={photo.result} />
                        {resultLabel}
                      </span>
                    ) : null}
                    {photo.source === "media" ? (
                      <span className="text-[11px] font-medium portal-text-muted uppercase tracking-wide">
                        Mídia
                      </span>
                    ) : null}
                  </div>
                  {photo.description ? (
                    <p className="text-xs portal-text-muted mt-1">{photo.description}</p>
                  ) : null}
                </div>
              </div>

              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="block border-t"
                style={{ borderColor: "var(--portal-border)" }}
              >
                {isVideo ? (
                  <video
                    src={src}
                    controls
                    className="w-full max-h-72 object-contain bg-black"
                    preload="metadata"
                  />
                ) : isImage ? (
                  <img
                    src={src}
                    alt={photo.label}
                    loading="lazy"
                    className="w-full max-h-72 object-contain bg-[#F8FAFC]"
                  />
                ) : (
                  <div className="h-28 flex items-center justify-center text-xs portal-text-muted px-4 text-center">
                    {photo.label}
                  </div>
                )}
              </a>
            </li>
          );
        })}
      </ul>

      {hasMore ? (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          className="w-full h-11 rounded-lg border text-sm font-medium portal-text"
          style={{ borderColor: "var(--portal-border)" }}
        >
          Carregar mais ({photos.length - visibleCount} restantes)
        </button>
      ) : null}
    </section>
  );
}
