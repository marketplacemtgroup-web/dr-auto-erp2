import type { PortalQuoteRow } from "../../lib/api";
import { resolveQuoteObservations } from "../../lib/portal-observations";

type PortalQuoteObservationsCardProps = {
  quote: PortalQuoteRow;
  cardClassName?: string;
};

/** Bloco de observações exibido dentro da aba Orçamento. */
export default function PortalQuoteObservationsCard({
  quote,
  cardClassName = "quote-sheet__card p-4",
}: PortalQuoteObservationsCardProps) {
  const sections = resolveQuoteObservations(quote);
  if (sections.length === 0) return null;

  return (
    <>
      {sections.map((section) => (
        <section key={section.title} className={cardClassName}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-2">
            {section.title}
          </p>
          <p className="text-sm text-[#1E293B] whitespace-pre-wrap leading-relaxed">{section.text}</p>
        </section>
      ))}
    </>
  );
}
