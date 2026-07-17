import type { PrintObservationBlock } from "../../lib/print-observations";

type Props = {
  blocks: PrintObservationBlock[];
};

export default function PrintCustomerObservations({ blocks }: Props) {
  if (blocks.length === 0) return null;

  return (
    <section className="mb-4 space-y-3">
      {blocks.map((block) => (
        <div key={`${block.title}-${block.text.slice(0, 24)}`}>
          <p className="text-[10px] font-semibold uppercase text-[#64748B]">{block.title}</p>
          <p className="whitespace-pre-wrap">{block.text}</p>
        </div>
      ))}
    </section>
  );
}
