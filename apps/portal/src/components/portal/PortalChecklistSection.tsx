import { AlertTriangle, CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import type { PortalChecklistItem } from "../../lib/api";
import {
  CHECKLIST_RESULT_LABELS,
  checklistResultVariant,
  groupChecklistByCategory,
  type ChecklistResult,
} from "../../lib/checklist";
import { resolveMediaUrl } from "../../lib/mediaUrl";
import { isImageMime, isVideoMime } from "../../lib/mediaTypes";

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

export default function PortalChecklistSection({ items }: { items: PortalChecklistItem[] }) {
  const filled = items.filter((i) => i.result || i.photoUrl);
  if (filled.length === 0) return null;

  const groups = groupChecklistByCategory(items);

  return (
    <section className="portal-card overflow-hidden">
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--portal-border)" }}>
        <h2 className="text-sm font-semibold portal-text">Checklist de entrada do veículo</h2>
        <p className="text-xs portal-text-muted mt-1">
          Verificação feita pela oficina na recepção do veículo. Toque nas fotos para ampliar.
        </p>
      </div>

      <div className="divide-y" style={{ borderColor: "var(--portal-border)" }}>
        {groups.map((group) => (
          <div key={group.key}>
            <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide portal-text-muted bg-[#F8FAFC] dark:bg-white/5">
              {group.label}
            </p>
            <ul className="divide-y" style={{ borderColor: "var(--portal-border)" }}>
              {group.items.map((item) => {
                const resultLabel = item.result
                  ? CHECKLIST_RESULT_LABELS[item.result]
                  : "Pendente";
                const photoSrc = item.photoUrl ? resolveMediaUrl(item.photoUrl) : null;
                const isImage = item.photoMimeType ? isImageMime(item.photoMimeType) : true;
                const isVideo = item.photoMimeType ? isVideoMime(item.photoMimeType) : false;

                return (
                  <li key={item.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <ResultIcon result={item.result} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium portal-text">{item.label}</p>
                          <span
                            className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border ${resultBadgeClass(item.result)}`}
                          >
                            {resultLabel}
                          </span>
                        </div>
                        {item.notes ? (
                          <p className="text-xs portal-text-muted mt-1">{item.notes}</p>
                        ) : null}
                        {photoSrc ? (
                          <a
                            href={photoSrc}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 block rounded-lg overflow-hidden border max-w-[200px]"
                            style={{ borderColor: "var(--portal-border)" }}
                          >
                            {isVideo ? (
                              <video
                                src={photoSrc}
                                controls
                                className="w-full h-28 object-cover bg-black"
                                preload="metadata"
                              />
                            ) : isImage ? (
                              <img
                                src={photoSrc}
                                alt={`Foto: ${item.label}`}
                                className="w-full h-28 object-cover"
                              />
                            ) : (
                              <div className="h-28 flex items-center justify-center text-xs portal-text-muted px-2 text-center">
                                Ver anexo
                              </div>
                            )}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
