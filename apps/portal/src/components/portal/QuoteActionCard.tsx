import { Check, Loader2, X } from "lucide-react";
import type { PortalQuoteRow } from "../../lib/api";
import { formatMoney } from "../../lib/format";

export default function QuoteActionCard({
  quote,
  busy,
  onApprove,
  onReject,
}: {
  quote: PortalQuoteRow & { canRespond?: boolean };
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <article
      className="portal-card p-4"
      style={{ borderColor: "rgba(251, 191, 36, 0.5)", borderWidth: 2 }}
    >
      <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">
        Orçamento pendente
      </p>
      <p className="text-2xl font-bold mt-1" style={{ color: "var(--portal-primary)" }}>
        {formatMoney(quote.amount)}
      </p>
      <p className="portal-text-muted text-sm mt-1">
        Ordem de serviço #{quote.serviceOrder.number}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className="h-12 rounded-xl bg-green-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
          Aprovar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className="h-12 rounded-xl border-2 border-red-600 text-red-600 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <X size={20} />
          Recusar
        </button>
      </div>
    </article>
  );
}
