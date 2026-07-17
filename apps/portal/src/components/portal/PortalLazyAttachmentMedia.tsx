import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { usePortalAttachmentUrl } from "../../hooks/usePortalAttachmentUrl";
import { resolveMediaUrl } from "../../lib/mediaUrl";
import { isImageMime, isVideoMime } from "../../lib/mediaTypes";

type Props = {
  attachmentId?: string | null;
  url?: string;
  mimeType: string;
  label: string;
  className?: string;
  imgClassName?: string;
};

export default function PortalLazyAttachmentMedia({
  attachmentId,
  url: presetUrl,
  mimeType,
  label,
  className = "",
  imgClassName = "w-full h-28 object-cover",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(Boolean(presetUrl));

  useEffect(() => {
    if (presetUrl) return;
    const el = rootRef.current;
    if (!el || !attachmentId) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [attachmentId, presetUrl]);

  const { data, isLoading, isError } = usePortalAttachmentUrl(
    attachmentId,
    visible && !presetUrl,
  );

  const resolved = presetUrl
    ? resolveMediaUrl(presetUrl)
    : data?.url
      ? resolveMediaUrl(data.url)
      : null;

  const isImage = isImageMime(mimeType);
  const isVideo = isVideoMime(mimeType);

  return (
    <div ref={rootRef} className={className}>
      {!resolved && (isLoading || (visible && !isError)) ? (
        <div className={`${imgClassName} flex items-center justify-center bg-[#F8FAFC]`}>
          <Loader2 size={18} className="animate-spin portal-text-muted" />
        </div>
      ) : null}
      {isError ? (
        <div className={`${imgClassName} flex items-center justify-center text-xs portal-text-muted px-2 text-center`}>
          Não foi possível carregar a mídia
        </div>
      ) : null}
      {resolved && isVideo ? (
        <video
          src={resolved}
          controls
          className={imgClassName}
          preload="metadata"
        />
      ) : null}
      {resolved && isImage ? (
        <img
          src={resolved}
          alt={label}
          loading="lazy"
          decoding="async"
          className={imgClassName}
        />
      ) : null}
      {resolved && !isVideo && !isImage ? (
        <a
          href={resolved}
          target="_blank"
          rel="noreferrer"
          className={`${imgClassName} flex items-center justify-center text-xs portal-text-muted px-2 text-center underline`}
        >
          Ver anexo
        </a>
      ) : null}
    </div>
  );
}
