import { MessageSquareText } from "lucide-react";
import type { PortalObservationSection } from "../../lib/portal-observations";

type PortalObservationsTabProps = {
  /** @deprecated Use `sections` — mantido para compatibilidade */
  text?: string | null;
  sections?: PortalObservationSection[];
  title?: string;
  emptyLabel?: string;
};

export default function PortalObservationsTab({
  text,
  sections,
  title = "Observações da oficina",
  emptyLabel = "A oficina ainda não registrou observações para você.",
}: PortalObservationsTabProps) {
  const blocks: PortalObservationSection[] =
    sections && sections.length > 0
      ? sections
      : text?.trim()
        ? [{ title, text: text.trim() }]
        : [];

  if (blocks.length === 0) {
    return (
      <section className="portal-card p-8 text-center">
        <MessageSquareText className="mx-auto mb-3 portal-text-muted" size={32} />
        <p className="text-sm portal-text-muted">{emptyLabel}</p>
      </section>
    );
  }

  if (blocks.length === 1) {
    const block = blocks[0];
    return (
      <section className="portal-card overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--portal-border)" }}>
          <h2 className="text-sm font-semibold portal-text">{block.title}</h2>
          <p className="text-xs portal-text-muted mt-0.5">
            Informações registradas pela equipe da oficina.
          </p>
        </div>
        <div className="p-4">
          <div
            className="rounded-xl border px-4 py-4 text-sm portal-text whitespace-pre-wrap leading-relaxed min-h-[120px]"
            style={{
              borderColor: "var(--portal-border)",
              backgroundColor: "var(--portal-surface, #fff)",
            }}
          >
            {block.text}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {blocks.map((block) => (
        <div key={block.title} className="portal-card overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--portal-border)" }}>
            <h2 className="text-sm font-semibold portal-text">{block.title}</h2>
          </div>
          <div className="p-4">
            <div
              className="rounded-xl border px-4 py-4 text-sm portal-text whitespace-pre-wrap leading-relaxed"
              style={{
                borderColor: "var(--portal-border)",
                backgroundColor: "var(--portal-surface, #fff)",
              }}
            >
              {block.text}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
