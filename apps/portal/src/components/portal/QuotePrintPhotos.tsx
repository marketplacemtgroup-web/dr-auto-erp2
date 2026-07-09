type PrintPhoto = {
  url: string;
  label: string;
  mimeType: string;
};

/** Fotos exibidas somente na impressao/PDF do orcamento. */
export default function QuotePrintPhotos({ photos }: { photos: PrintPhoto[] }) {
  const images = photos.filter((p) => p.mimeType.startsWith("image/") && p.url);
  if (images.length === 0) return null;

  return (
    <section className="hidden print:block quote-sheet__card p-4 break-inside-avoid">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-2">
        Registro fotográfico
      </p>
      <div className="grid grid-cols-4 gap-2">
        {images.map((photo, index) => (
          <div key={`${photo.url}-${index}`} className="border border-[#E2E8F0] rounded overflow-hidden">
            <img src={photo.url} alt={photo.label} className="w-full h-24 object-cover" />
          </div>
        ))}
      </div>
    </section>
  );
}
