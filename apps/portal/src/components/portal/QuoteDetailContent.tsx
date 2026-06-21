import { Check, Loader2, X } from "lucide-react";
import StatusBadge from "../StatusBadge";
import type { PortalQuoteRow } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import {
  approvedQuoteLines,
  groupQuoteLines,
  isSupplementQuote,
  pendingQuoteLines,
  quoteLineTotal,
  quoteNeedsResponse,
  sumQuoteLines,
} from "../../lib/quote-lines";
import { quoteStatusLabel, quoteStatusVariant } from "../../lib/service-order-status";

function LineList({ lines }: { lines: NonNullable<PortalQuoteRow["lines"]> }) {
  const groups = groupQuoteLines(lines);
  return groups.map((group) => (
    <section key={group.key} className="quote-sheet__card overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#F1F5F9]">
        <h2 className="text-sm font-semibold text-[#1E293B]">{group.label}</h2>
        <p className="text-sm font-bold text-[#0F3D4C]">{formatMoney(group.subtotal)}</p>
      </div>
      <ul className="divide-y divide-[#F1F5F9]">
        {group.lines.map((line) => (
          <li key={line.id} className="px-4 py-3 flex gap-3 items-start">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1E293B]">{line.description}</p>
              <p className="text-xs text-[#64748B]">
                {line.quantity}x {formatMoney(line.unitPrice)}
              </p>
            </div>
            <p className="text-sm font-semibold shrink-0 text-[#0F3D4C]">
              {formatMoney(quoteLineTotal(line))}
            </p>
          </li>
        ))}
      </ul>
    </section>
  ));
}

export default function QuoteDetailContent({
  quote,
  busy,
  onApprove,
  onReject,
  showOsLink,
  onViewOs,
}: {
  quote: PortalQuoteRow;
  busy?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  showOsLink?: boolean;
  onViewOs?: () => void;
}) {
  const lines = quote.lines ?? [];
  const approvedLines = approvedQuoteLines(lines);
  const pendingLines = pendingQuoteLines(lines);
  const supplement = quote.isSupplement ?? isSupplementQuote(lines);
  const canRespond = quoteNeedsResponse(quote);
  const approvedTotal = sumQuoteLines(approvedLines);
  const pendingTotal = sumQuoteLines(pendingLines);
  const displayTotal = canRespond && supplement && pendingLines.length > 0
    ? pendingTotal
    : Number(quote.amount);

  return (
    <div className="space-y-4">
      <section className="quote-sheet__card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase font-semibold tracking-wide text-[#64748B]">
              {supplement ? "Complemento do orçamento" : "Orçamento"}{" "}
              {quote.number ? `#${quote.number}` : ""}
            </p>
            <p className="text-sm text-[#64748B] mt-1">OS #{quote.serviceOrder.number}</p>
          </div>
          <StatusBadge variant={quoteStatusVariant(quote.status)} />
        </div>
        <p className="text-xs text-[#64748B] mt-2">{quoteStatusLabel(quote.status)}</p>
        {supplement && canRespond ? (
          <p className="text-sm mt-3 text-[#1E293B]">
            A oficina adicionou novos itens. Revise o complemento e aprove ou recuse.
          </p>
        ) : null}
        <p className="text-2xl font-bold text-[#0F3D4C] mt-3">{formatMoney(displayTotal)}</p>
        {supplement && approvedLines.length > 0 ? (
          <p className="text-xs text-[#64748B] mt-1">
            Itens já aprovados: {formatMoney(approvedTotal)}
          </p>
        ) : null}
        {showOsLink && onViewOs ? (
          <button
            type="button"
            onClick={onViewOs}
            className="mt-3 text-sm font-medium text-[#0E7490] hover:underline"
          >
            Ver ordem de serviço
          </button>
        ) : null}
      </section>

      {supplement && approvedLines.length > 0 ? (
        <div className="space-y-3">
          <div className="quote-sheet__card px-4 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-[#0F172A]">
              Já aprovados
            </p>
          </div>
          <LineList lines={approvedLines} />
        </div>
      ) : null}

      {pendingLines.length > 0 ? (
        <div className="space-y-3">
          {supplement ? (
            <div className="quote-sheet__card px-4 py-3 border-2 border-amber-400 bg-amber-50">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-950 leading-snug">
                Novos itens — aguardando sua aprovação
              </p>
            </div>
          ) : null}
          <LineList lines={pendingLines} />
        </div>
      ) : lines.length === 0 ? (
        <section className="quote-sheet__card p-4">
          <p className="text-sm text-[#64748B]">
            Os itens deste orçamento ainda não foram detalhados. Entre em contato com a oficina
            para mais informações.
          </p>
        </section>
      ) : !supplement ? (
        <LineList lines={lines} />
      ) : null}

      {lines.length > 0 ? (
        <section className="quote-sheet__card p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-[#1E293B]">
              {supplement && canRespond ? "Total dos novos itens" : "Valor total"}
            </p>
            <p className="text-xl font-bold text-[#0F3D4C]">{formatMoney(displayTotal)}</p>
          </div>
          {supplement && approvedLines.length > 0 ? (
            <p className="text-xs text-[#64748B] mt-2">
              Orçamento completo (com itens já aprovados):{" "}
              {formatMoney(approvedTotal + (canRespond ? pendingTotal : 0))}
            </p>
          ) : null}
        </section>
      ) : null}

      {canRespond && onApprove && onReject ? (
        <div className="grid grid-cols-2 gap-3 print:hidden">
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="h-12 rounded-xl bg-green-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-green-700 active:bg-green-800"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {supplement ? "Aprovar novos itens" : "Aprovar"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onReject}
            className="h-12 rounded-xl bg-red-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-red-700 active:bg-red-800"
          >
            <X size={18} />
            Recusar
          </button>
        </div>
      ) : null}
    </div>
  );
}
