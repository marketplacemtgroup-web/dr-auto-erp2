import { Check, ChevronRight, Loader2, X } from "lucide-react";
import type { PortalQuoteRow } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { pendingQuoteLines, quoteNeedsResponse } from "../../lib/quote-lines";

export default function QuoteActionCard({
  quote,
  busy,
  onOpen,
  onApprove,
  onReject,
}: {
  quote: PortalQuoteRow & { canRespond?: boolean };
  busy: boolean;
  onOpen: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const supplement = quote.isSupplement ?? false;
  const pendingCount = quote.pendingLineCount ?? pendingQuoteLines(quote.lines ?? []).length;
  const canRespond = quoteNeedsResponse(quote);

  return (
    <article
      className="portal-card overflow-hidden"
      style={{ borderColor: "rgba(251, 191, 36, 0.5)", borderWidth: 2 }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">
              {supplement ? "Novos itens no orçamento" : "Orçamento pendente"}
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: "var(--portal-primary)" }}>
              {formatMoney(quote.amount)}
            </p>
            <p className="portal-text-muted text-sm mt-1">
              Ordem de serviço #{quote.serviceOrder.number}
              {supplement && pendingCount > 0
                ? ` · ${pendingCount} item(ns) novo(s)`
                : ""}
            </p>
            <p className="portal-accent text-sm font-medium mt-2">
              Ver peças e serviços
            </p>
          </div>
          <ChevronRight className="portal-text-muted shrink-0 mt-1" size={22} />
        </div>
      </button>
      {canRespond ? (
        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="h-11 rounded-xl bg-green-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-green-700 active:bg-green-800"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {supplement ? "Aprovar novos" : "Aprovar tudo"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onReject}
            className="h-11 rounded-xl bg-red-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-red-700 active:bg-red-800"
          >
            <X size={18} />
            Recusar
          </button>
        </div>
      ) : null}
    </article>
  );
}
