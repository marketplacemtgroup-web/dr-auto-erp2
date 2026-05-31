import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { Check, ChevronRight, Loader2, MessageCircle, X } from "lucide-react";
import PortalShell from "../components/portal/PortalShell";
import StatusBadge from "../components/StatusBadge";
import { ApiError, api, type PortalQuoteRow } from "../lib/api";
import { formatMoney } from "../lib/format";
import { resolveMediaUrl } from "../lib/mediaUrl";
import { isImageMime, isVideoMime } from "../lib/mediaTypes";
import { routes } from "../lib/routes";
import { quoteStatusLabel, quoteStatusVariant, osStatusLabel } from "../lib/service-order-status";
import { whatsappUrl } from "../lib/whatsapp";
import { usePortalStore } from "../stores/portalStore";

type PortalQuote = PortalQuoteRow & { canRespond?: boolean };

export default function PortalHomePage() {
  const navigate = useNavigate();
  const session = usePortalStore((s) => s.session);
  const dashboard = usePortalStore((s) => s.dashboard);
  const refresh = usePortalStore((s) => s.refresh);
  const logout = usePortalStore((s) => s.logout);

  const [actingId, setActingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedForToken = useRef<string | null>(null);

  const quotes = (dashboard?.quotes ?? []) as PortalQuote[];
  const pending = useMemo(
    () => quotes.filter((q) => q.status === "PENDING" || q.canRespond),
    [quotes],
  );

  async function syncDashboard(force = false) {
    if (!session?.accessToken) return;
    const token = session.accessToken;
    if (!force && fetchedForToken.current === token && dashboard) return;
    setRefreshing(true);
    setError(null);
    try {
      await refresh();
      fetchedForToken.current = token;
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? String(err.message)
          : err instanceof Error
            ? err.message
            : "Erro ao carregar dados";
      setError(msg);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!session?.accessToken) return;
    if (fetchedForToken.current === session.accessToken && dashboard) return;
    void syncDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uma vez por token de sessão
  }, [session?.accessToken]);

  if (!session?.accessToken) return <Navigate to={routes.login} replace />;

  const phone =
    dashboard?.customer.whatsapp ||
    dashboard?.customer.phone ||
    dashboard?.organization.phone;

  async function approve(id: string) {
    if (!session?.accessToken) return;
    const quote = quotes.find((q) => q.id === id);
    const payload =
      quote?.lines && quote.lines.length > 0
        ? { lines: quote.lines.map((l) => ({ lineId: l.id, approved: true })) }
        : undefined;
    setActingId(id);
    try {
      await api.portalApprove(session.accessToken, id, payload);
      await syncDashboard(true);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao aprovar");
    } finally {
      setActingId(null);
    }
  }

  async function reject(id: string) {
    if (!session?.accessToken) return;
    if (!confirm("Recusar este orçamento? A oficina será notificada.")) return;
    setActingId(id);
    try {
      await api.portalReject(session.accessToken, id);
      await syncDashboard(true);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao recusar");
    } finally {
      setActingId(null);
    }
  }

  const welcome = dashboard?.organization.portalWelcome?.trim();

  return (
    <PortalShell
      title={session.customerName}
      subtitle={`Placa ${session.plate} · ${session.organizationName}`}
    >
      {welcome ? (
        <p className="text-sm text-[#64748B] bg-white rounded-xl p-4 border border-[#E2E8F0]">
          {welcome}
        </p>
      ) : null}

      {phone ? (
        <a
          href={whatsappUrl(phone, `Olá! Sou cliente da placa ${session.plate}.`)}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white font-medium text-sm"
        >
          <MessageCircle size={20} />
          WhatsApp da oficina
        </a>
      ) : null}

      {refreshing && dashboard ? (
        <p className="text-xs text-[#94A3B8] text-center">Atualizando...</p>
      ) : null}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
          <button
            type="button"
            className="block mt-2 underline"
            onClick={() => void syncDashboard(true)}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!dashboard && refreshing && !error ? (
        <div className="bg-white rounded-xl p-6 flex items-center justify-center gap-2 text-[#64748B] text-sm">
          <Loader2 size={18} className="animate-spin" />
          Carregando...
        </div>
      ) : null}

      {dashboard && !error && pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[#1E293B]">
            Aguardando sua aprovação ({pending.length})
          </h2>
          {pending.map((q) => (
            <QuoteActionCard
              key={q.id}
              quote={q}
              busy={actingId === q.id}
              onApprove={() => approve(q.id)}
              onReject={() => reject(q.id)}
            />
          ))}
        </section>
      )}

      {dashboard && dashboard.serviceOrders.length > 0 && (
        <section className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <h2 className="px-4 py-3 text-sm font-semibold border-b border-[#F1F5F9]">
            Ordens de serviço
          </h2>
          <ul className="divide-y divide-[#F1F5F9]">
            {dashboard.serviceOrders.map((so) => (
              <li key={so.id}>
                <Link
                  to={routes.serviceOrder(so.id)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1E293B]">OS #{so.number}</p>
                    <p className="text-xs text-[#0E7490]">{osStatusLabel(so.status)}</p>
                  </div>
                  <span className="text-sm font-bold text-[#0F3D4C]">
                    {formatMoney(so.totalAmount)}
                  </span>
                  <ChevronRight size={18} className="text-[#94A3B8] shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dashboard && dashboard.attachments.length > 0 && (
        <section className="bg-white rounded-xl border border-[#E2E8F0] p-4">
          <h2 className="text-sm font-semibold mb-3">Fotos recentes</h2>
          <div className="grid grid-cols-3 gap-2">
            {dashboard.attachments.slice(0, 6).map((a) => (
              <a
                key={a.id}
                href={resolveMediaUrl(a.url)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg overflow-hidden border border-[#E2E8F0]"
              >
                {isImageMime(a.mimeType) ? (
                  <img
                    src={resolveMediaUrl(a.url)}
                    alt={a.fileName}
                    className="w-full h-20 object-cover"
                  />
                ) : isVideoMime(a.mimeType) ? (
                  <video
                    src={resolveMediaUrl(a.url)}
                    className="w-full h-20 object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <div className="h-20 flex items-center justify-center text-[10px] text-[#64748B] p-1 text-center">
                    {a.fileName}
                  </div>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {dashboard && quotes.length > 0 && (
        <section className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F1F5F9]">
            <h2 className="text-sm font-semibold text-[#1E293B]">Orçamentos</h2>
          </div>
          <ul className="divide-y divide-[#F1F5F9]">
            {quotes.map((q) => (
              <li key={q.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#1E293B]">OS #{q.serviceOrder.number}</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      {new Date(q.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[#0F3D4C]">{formatMoney(q.amount)}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge variant={quoteStatusVariant(q.status)} />
                  <span className="text-xs text-[#64748B]">{quoteStatusLabel(q.status)}</span>
                </div>
                {(q.status === "PENDING" || q.canRespond) && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={actingId === q.id}
                      onClick={() => approve(q.id)}
                      className="h-11 rounded-lg bg-[#16A34A] text-white text-sm font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Check size={18} />
                      Aprovar
                    </button>
                    <button
                      type="button"
                      disabled={actingId === q.id}
                      onClick={() => reject(q.id)}
                      className="h-11 rounded-lg bg-[#DC2626] text-white text-sm font-semibold flex items-center justify-center gap-1.5"
                    >
                      <X size={18} />
                      Recusar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        onClick={() => {
          logout();
          navigate(routes.login);
        }}
        className="w-full h-11 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#64748B] font-medium"
      >
        Sair do portal
      </button>
    </PortalShell>
  );
}

function QuoteActionCard({
  quote,
  busy,
  onApprove,
  onReject,
}: {
  quote: PortalQuote;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <article className="bg-white rounded-xl border-2 border-[#FBBF24]/50 shadow-sm p-4">
      <p className="text-xs font-medium text-[#D97706] uppercase tracking-wide">Orçamento pendente</p>
      <p className="text-2xl font-bold text-[#0F3D4C] mt-1">{formatMoney(quote.amount)}</p>
      <p className="text-sm text-[#64748B] mt-1">Ordem de serviço #{quote.serviceOrder.number}</p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className="h-12 rounded-xl bg-[#16A34A] text-white text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
          Aprovar orçamento
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className="h-12 rounded-xl bg-white border-2 border-[#DC2626] text-[#DC2626] text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <X size={20} />
          Recusar
        </button>
      </div>
    </article>
  );
}
