import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { Check, Loader2, Printer, X } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import { ApiError, api, type QuoteLineRow } from "../lib/api";
import { formatMoney } from "../lib/format";
import { quoteStatusLabel, quoteStatusVariant } from "../lib/service-order-status";

export default function PublicQuotePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.publicQuote>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [lineChoices, setLineChoices] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.publicQuote(token);
      setData(res);
      const initial: Record<string, boolean> = {};
      (res.quote.lines ?? []).forEach((l) => {
        initial[l.id] = true;
      });
      setLineChoices(initial);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "Link inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const lines = useMemo(() => data?.quote.lines ?? [], [data]);
  const canRespond = data?.quote.canRespond ?? data?.quote.status === "PENDING";

  async function approve() {
    if (!token || !data) return;
    setActing(true);
    try {
      const payload =
        lines.length > 0
          ? {
              lines: lines.map((l) => ({
                lineId: l.id,
                approved: lineChoices[l.id] ?? true,
              })),
            }
          : undefined;
      await api.publicApproveQuote(token, payload);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao aprovar");
    } finally {
      setActing(false);
    }
  }

  async function reject() {
    if (!token) return;
    if (!confirm("Recusar este orçamento?")) return;
    setActing(true);
    try {
      await api.publicRejectQuote(token);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao recusar");
    } finally {
      setActing(false);
    }
  }

  function lineTotal(line: QuoteLineRow) {
    return Number(line.unitPrice) * line.quantity - Number(line.discount ?? 0);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] text-[#64748B]">
        <Loader2 className="animate-spin mr-2" size={20} />
        Carregando orçamento...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] px-4">
        <p className="text-red-600 text-center">{error ?? "Orçamento não encontrado."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] public-quote-page">
      <header className="bg-[#0F3D4C] text-white px-4 py-5 print:hidden">
        <div className="max-w-lg mx-auto flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/70">Orçamento online</p>
            <h1 className="text-lg font-semibold mt-0.5">{data.organizationName}</h1>
            <p className="text-sm text-white/80 mt-1">
              {data.customerName} · {data.vehicle.plate}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
          >
            <Printer size={16} />
            PDF
          </button>
        </div>
      </header>

      <div className="hidden print:block px-4 py-3 border-b border-[#E2E8F0]">
        <p className="text-xs uppercase text-[#64748B]">Orçamento online</p>
        <h1 className="text-lg font-semibold">{data.organizationName}</h1>
        <p className="text-sm text-[#64748B]">
          {data.customerName} · {data.vehicle.plate}
        </p>
      </div>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-[#1E293B]">
              Orçamento {data.quote.number ? `#${data.quote.number}` : ""}
            </h2>
            <StatusBadge variant={quoteStatusVariant(data.quote.status)} />
          </div>
          <p className="text-xs text-[#64748B] mt-1">{quoteStatusLabel(data.quote.status)}</p>
          <p className="text-2xl font-bold text-[#0F3D4C] mt-3">{formatMoney(data.quote.amount)}</p>
        </div>

        {lines.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <p className="px-4 py-3 text-sm font-medium text-[#1E293B] border-b border-[#F1F5F9]">
              Itens do orçamento
            </p>
            <ul className="divide-y divide-[#F1F5F9]">
              {lines.map((line) => (
                <li key={line.id} className="px-4 py-3 flex gap-3 items-start">
                  {canRespond && (
                    <input
                      type="checkbox"
                      checked={lineChoices[line.id] ?? true}
                      onChange={(e) =>
                        setLineChoices((c) => ({ ...c, [line.id]: e.target.checked }))
                      }
                      className="mt-1"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1E293B]">{line.description}</p>
                    <p className="text-xs text-[#64748B]">
                      {line.quantity}x {formatMoney(line.unitPrice)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#0F3D4C]">{formatMoney(lineTotal(line))}</p>
                </li>
              ))}
            </ul>
            {canRespond && (
              <p className="px-4 py-2 text-xs text-[#64748B] bg-[#F8FAFC]">
                Desmarque itens que não deseja aprovar (aprovação parcial).
              </p>
            )}
          </div>
        )}

        {canRespond && (
          <div className="flex gap-3 print:hidden">
            <button
              type="button"
              disabled={acting}
              onClick={() => void approve()}
              className="flex-1 h-12 rounded-xl bg-[#0F3D4C] text-white font-medium flex items-center justify-center gap-2"
            >
              {acting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Aprovar
            </button>
            <button
              type="button"
              disabled={acting}
              onClick={() => void reject()}
              className="h-12 px-4 rounded-xl border border-red-200 text-red-600 font-medium flex items-center gap-1"
            >
              <X size={18} />
              Recusar
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
