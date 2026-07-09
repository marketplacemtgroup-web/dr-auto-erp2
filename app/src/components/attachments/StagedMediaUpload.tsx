import { useEffect, useRef, useState } from "react";
import { CloudUpload, ImagePlus, X } from "lucide-react";
import { isImageMime } from "../../lib/mediaTypes";
import { prepareMediaForUpload } from "../../lib/imageToWebp";

type StagedItem = {
  id: string;
  file: File;
  previewUrl: string;
};

type StagedMediaUploadProps = {
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
  onComplete?: () => void;
};

export default function StagedMediaUpload({
  disabled,
  onUpload,
  onComplete,
}: StagedMediaUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const stagedRef = useRef<StagedItem[]>([]);
  const [staged, setStaged] = useState<StagedItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  stagedRef.current = staged;

  useEffect(() => {
    return () => {
      for (const item of stagedRef.current) URL.revokeObjectURL(item.previewUrl);
    };
  }, []);

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: StagedItem[] = [];
    for (const file of Array.from(files)) {
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    setStaged((prev) => [...prev, ...next]);
    setError(null);
  }

  function removeStaged(id: string) {
    setStaged((prev) => {
      const item = prev.find((s) => s.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((s) => s.id !== id);
    });
  }

  async function handleUploadAll() {
    if (!staged.length || uploading) return;
    setUploading(true);
    setError(null);
    try {
      for (const item of staged) {
        const prepared = await prepareMediaForUpload(item.file);
        await onUpload(prepared);
      }
      for (const item of staged) URL.revokeObjectURL(item.previewUrl);
      setStaged([]);
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar mídia");
    } finally {
      setUploading(false);
    }
  }

  const busy = disabled || uploading;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white text-[#1E293B] text-sm hover:bg-[#F8FAFC] disabled:opacity-50"
        >
          <ImagePlus size={16} />
          Escolher fotos ou vídeos
        </button>
        {staged.length > 0 && (
          <button
            type="button"
            onClick={() => void handleUploadAll()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#0F3D4C] text-white text-sm hover:bg-[#0a2d38] disabled:opacity-50"
          >
            <CloudUpload size={16} />
            {uploading ? "Enviando..." : `Subir para sistema (${staged.length})`}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {staged.length > 0 && (
        <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-3">
          <p className="text-xs text-[#64748B] mb-2">
            {staged.length} arquivo(s) selecionado(s). Imagens PNG/JPEG serão convertidas para WebP ao enviar.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {staged.map((item) => (
              <div
                key={item.id}
                className="relative aspect-square rounded-lg overflow-hidden border border-[#E2E8F0] bg-white"
              >
                {isImageMime(item.file.type) ? (
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2 text-[10px] text-center text-[#64748B]">
                    {item.file.name}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeStaged(item.id)}
                  disabled={busy}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
                  aria-label="Remover"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
