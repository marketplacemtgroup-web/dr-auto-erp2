import { OBSERVATION_ITEMS, WARRANTY_PARAGRAPHS } from "../../lib/print-legal-content";

/** Termos legais para impressão de orçamento e ordem de serviço (PDF Wtec Motors). */
export default function PrintLegalTerms() {
  return (
    <section className="print-legal-terms text-[10px] leading-[1.3] text-[#444]">
      <h3 className="text-[11px] font-bold text-[#111] mb-0.5">TERMOS DE GARANTIA</h3>
      <div className="space-y-0.5 mb-2 text-justify">
        {WARRANTY_PARAGRAPHS.map((paragraph) => (
          <p key={paragraph.slice(0, 40)}>{paragraph}</p>
        ))}
      </div>

      <h3 className="text-[11px] font-bold text-[#111] mb-0.5">OBSERVAÇÕES</h3>
      <ol className="list-decimal list-outside pl-3.5 space-y-0.5 text-justify print:columns-2 print:gap-x-4">
        {OBSERVATION_ITEMS.map((item) => (
          <li key={item.slice(0, 40)}>{item}</li>
        ))}
      </ol>
    </section>
  );
}
