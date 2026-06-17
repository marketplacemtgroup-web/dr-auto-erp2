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
  sumQuoteLines,
} from "../../lib/quote-lines";
import { quoteStatusLabel, quoteStatusVariant } from "../../lib/service-order-status";

function LineList({
  lines,
  canChoose,
  lineChoices,
  onLineChoiceChange,
}: {
  lines: NonNullable<PortalQuoteRow["lines"]>;
  canChoose: boolean;
  lineChoices: Record<string, boolean>;
  onLineChoiceChange?: (lineId: string, approved: boolean) => void;
}) {
  const groups = groupQuoteLines(lines);
  return groups.map((group) => (
    <section key={group.key} className="portal-card overflow-hidden">
      <div
        className="px-4 py-3 flex items-center justify-between border-b"
        style={{ borderColor: "var(--portal-border)" }}
      >
        <h2 className="text-sm font-semibold portal-text">{group.label}</h2>
        <p className="text-sm font-bold" style={{ color: "var(--portal-primary)" }}>
          {formatMoney(group.subtotal)}
        </p>
      </div>
      <ul className="divide-y" style={{ borderColor: "var(--portal-border)" }}>
        {group.lines.map((line) => (
          <li key={line.id} className="px-4 py-3 flex gap-3 items-start">
            {canChoose && onLineChoiceChange ? (
              <input
                type="checkbox"
                checked={lineChoices[line.id] ?? true}
                onChange={(e) => onLineChoiceChange(line.id, e.target.checked)}
                className="mt-1"
                aria-label={`Incluir ${line.description}`}
              />
            ) : null}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium portal-text">{line.description}</p>
              <p className="text-xs portal-text-muted">
                {line.quantity}x {formatMoney(line.unitPrice)}
              </p>
            </div>
            <p className="text-sm font-semibold shrink-0" style={{ color: "var(--portal-primary)" }}>
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
  lineChoices,
  onLineChoiceChange,
  busy,
  onApprove,
  onReject,
  showOsLink,
  onViewOs,
}: {
  quote: PortalQuoteRow;
  lineChoices: Record<string, boolean>;
  onLineChoiceChange?: (lineId: string, approved: boolean) => void;
  busy?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  showOsLink?: boolean;
  onViewOs?: () => void;
}) {
  const lines = quote.lines ?? [];
  const approvedLines = approvedQuoteLines(lines);
  const pendingLines = pendingQuoteLines(lines);
  const supplement =
    quote.isSupplement ?? isSupplementQuote(lines);
  const canRespond = quote.canRespond ?? (quote.status === "PENDING" && pendingLines.length > 0);
  const selectedPendingTotal = sumQuoteLines(
    pendingLines.filter((line) => lineChoices[line.id] ?? true),
  );
  const approvedTotal = sumQuoteLines(approvedLines);
  const displayTotal = canRespond
    ? supplement
      ? selectedPendingTotal
      : sumQuoteLines(lines.filter((line) => lineChoices[line.id] ?? true))
    : Number(quote.amount);

  return (
    <div className="space-y-4">
      <section className="portal-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="portal-text-muted text-xs uppercase font-semibold tracking-wide">
              {supplement ? "Complemento do orçamento" : "Orçamento"}{" "}
              {quote.number ? `#${quote.number}` : ""}
            </p>
            <p className="portal-text-muted text-sm mt-1">
              OS #{quote.serviceOrder.number}
            </p>
          </div>
          <StatusBadge variant={quoteStatusVariant(quote.status)} />
        </div>
        <p className="text-xs portal-text-muted mt-2">{quoteStatusLabel(quote.status)}</p>
        {supplement && canRespond ? (
          <p className="text-sm mt-3 portal-text">
            A oficina adicionou novos itens. Revise e aprove apenas o que deseja.
          </p>
        ) : null}
        <p className="text-2xl font-bold mt-3" style={{ color: "var(--portal-primary)" }}>
          {formatMoney(displayTotal)}
        </p>
        {canRespond && pendingLines.length > 0 ? (
          <p className="text-xs portal-text-muted mt-1">
            {supplement
              ? `Total dos ${pendingLines.length} item(ns) novo(s) selecionado(s)`
              : "Total conforme itens selecionados abaixo"}
          </p>
        ) : null}
        {supplement && approvedLines.length > 0 ? (
          <p className="text-xs portal-text-muted mt-1">
            Itens já aprovados: {formatMoney(approvedTotal)}
          </p>
        ) : null}
        {showOsLink && onViewOs ? (
          <button
            type="button"
            onClick={onViewOs}
            className="mt-3 text-sm portal-accent font-medium"
          >
            Ver ordem de serviço
          </button>
        ) : null}
      </section>

      {supplement && approvedLines.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide portal-text-muted px-1">
            Já aprovados
          </p>
          <LineList lines={approvedLines} canChoose={false} lineChoices={lineChoices} />
        </div>
      ) : null}

      {pendingLines.length > 0 ? (
        <div className="space-y-3">
          {supplement ? (
            <p className="text-xs font-semibold uppercase tracking-wide portal-text-muted px-1">
              Novos itens — aguardando sua aprovação
            </p>
          ) : null}
          <LineList
            lines={pendingLines}
            canChoose={canRespond}
            lineChoices={lineChoices}
            onLineChoiceChange={onLineChoiceChange}
          />
        </div>
      ) : lines.length === 0 ? (
        <section className="portal-card p-4">
          <p className="portal-text-muted text-sm">
            Os itens deste orçamento ainda não foram detalhados. Entre em contato com a oficina para mais informações.
          </p>
        </section>
      ) : !supplement ? (
        <LineList
          lines={lines}
          canChoose={canRespond}
          lineChoices={lineChoices}
          onLineChoiceChange={onLineChoiceChange}
        />
      ) : null}

      {lines.length > 0 ? (
        <section className="portal-card p-4">
          <div className="flex items-center justify-between">
            <p className="portal-text font-semibold">
              {supplement && canRespond ? "Total dos novos itens" : "Valor total"}
            </p>
            <p className="text-xl font-bold" style={{ color: "var(--portal-primary)" }}>
              {formatMoney(displayTotal)}
            </p>
          </div>
          {supplement && approvedLines.length > 0 ? (
            <p className="text-xs portal-text-muted mt-2">
              Orçamento completo (com itens já aprovados):{" "}
              {formatMoney(approvedTotal + (canRespond ? selectedPendingTotal : 0))}
            </p>
          ) : null}
        </section>
      ) : null}

      {canRespond && onApprove && onReject ? (
        <>
          {pendingLines.length > 0 ? (
            <p className="text-xs portal-text-muted px-1">
              Desmarque itens que não deseja aprovar.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onApprove}
              className="h-12 rounded-xl bg-green-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
              {supplement ? "Aprovar novos itens" : "Aprovar"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="h-12 rounded-xl border-2 border-red-600 text-red-600 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <X size={20} />
              {supplement ? "Recusar novos itens" : "Recusar"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
