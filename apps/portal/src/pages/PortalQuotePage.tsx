import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import QuoteDetailContent from "../components/portal/QuoteDetailContent";
import { ApiError, api, type PortalQuoteRow } from "../lib/api";
import { buildApprovePayload, initialLineChoices } from "../lib/quote-lines";
import { routes } from "../lib/routes";
import { usePortalStore } from "../stores/portalStore";

export default function PortalQuotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = usePortalStore((s) => s.session);
  const refresh = usePortalStore((s) => s.refresh);
  const [quote, setQuote] = useState<PortalQuoteRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [lineChoices, setLineChoices] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!session?.accessToken || !id) return;
    setError(null);
    try {
      const data = await api.portalQuote(session.accessToken, id);
      setQuote(data);
      setLineChoices(initialLineChoices(data.lines ?? []));
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "Não foi possível carregar o orçamento");
    }
  }, [session?.accessToken, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve() {
    if (!session?.accessToken || !quote) return;
    const lines = quote.lines ?? [];
    const payload = buildApprovePayload(lines, lineChoices);
    setActing(true);
    try {
      await api.portalApprove(session.accessToken, quote.id, payload);
      await refresh();
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao aprovar");
    } finally {
      setActing(false);
    }
  }

  async function reject() {
    if (!session?.accessToken || !quote) return;
    if (!confirm("Recusar este orçamento? A oficina será notificada.")) return;
    setActing(true);
    try {
      await api.portalReject(session.accessToken, quote.id);
      await refresh();
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao recusar");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-4 -mt-2">
      <div className="flex items-center gap-2">
        <Link to={routes.home} className="inline-flex items-center gap-1 text-sm portal-accent">
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <h1 className="portal-text text-xl font-black flex-1">Orçamento</h1>
      </div>

      {error ? (
        <div className="portal-card p-4 text-sm text-red-600">{error}</div>
      ) : null}

      {!quote && !error ? (
        <div className="flex justify-center py-10 portal-text-muted">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : null}

      {quote ? (
        <QuoteDetailContent
          quote={quote}
          lineChoices={lineChoices}
          onLineChoiceChange={(lineId, approved) =>
            setLineChoices((current) => ({ ...current, [lineId]: approved }))
          }
          busy={acting}
          onApprove={() => void approve()}
          onReject={() => void reject()}
          showOsLink
          onViewOs={() => navigate(routes.serviceOrder(quote.serviceOrder.id))}
        />
      ) : null}
    </div>
  );
}
