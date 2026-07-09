const WEBP_MIME = "image/webp";
const CONVERTIBLE_MIME = new Set(["image/png", "image/jpeg", "image/jpg"]);

export function isConvertibleImage(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (CONVERTIBLE_MIME.has(mime)) return true;
  if (!mime && /\.(png|jpe?g)$/i.test(file.name)) return true;
  return false;
}

function webpFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "foto";
  return `${base}.webp`;
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Não foi possível ler a imagem"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function canvasToWebpBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Falha ao converter imagem para WebP"));
      },
      WEBP_MIME,
      quality,
    );
  });
}

/** Converte PNG/JPEG/JPG para WebP. Outros tipos são devolvidos sem alteração. */
export async function prepareMediaForUpload(file: File, quality = 0.85): Promise<File> {
  if (!isConvertibleImage(file)) return file;

  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não disponível");
  ctx.drawImage(img, 0, 0);

  const blob = await canvasToWebpBlob(canvas, quality);
  return new File([blob], webpFileName(file.name), { type: WEBP_MIME });
}
