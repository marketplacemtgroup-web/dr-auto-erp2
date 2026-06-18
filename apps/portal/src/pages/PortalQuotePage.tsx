import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import QuoteDetailContent from "../components/portal/QuoteDetailContent";
import QuoteSheetLayout from "../components/portal/QuoteSheetLayout";
import { ApiError, api, type PortalQuoteRow } from "../lib/api";
import { buildApprovePayload } from "../lib/quote-lines";
import { routes } from "../lib/routes";
import { usePortalStore } from "../stores/portalStore";
import { useBrandingStore } from "../stores/brandingStore";

export default function PortalQuotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = usePortalStore((s) => s.session);
  const dashboard = usePortalStore((s) => s.dashboard);
  const refresh = usePortalStore((s) => s.refresh);
  const organizationName = useBrandingStore((s) => s.appName);
  const [quote, setQuote] = useState<PortalQuoteRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.accessToken || !id) return;
    setError(null);
    try {
      setQuote(await api.portalQuote(session.accessToken, id));
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "Não foi possível carregar o orçamento");
    }
  }, [session?.accessToken, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve() {
    if (!session?.accessToken || !quote) return;
    const payload = buildApprovePayload(quote.lines ?? []);
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

  if (error) {
    return (
      <QuoteSheetLayout
        organizationName={organizationName}
        customerName={session?.customerName}
        vehiclePlate={session?.plate}
        backLink={
          <Link to={routes.home} className="inline-flex items-center gap-1 text-sm text-white/90">
            <ArrowLeft size={16} />
            Voltar
          </Link>
        }
      >
        <div className="quote-sheet__card p-4 text-sm text-red-600">{error}</div>
      </QuoteSheetLayout>
    );
  }

  if (!quote) {
    return (
      <QuoteSheetLayout
        organizationName={organizationName}
        customerName={session?.customerName}
        vehiclePlate={session?.plate}
      >
        <div className="flex justify-center py-10 text-[#64748B]">
          <Loader2 className="animate-spin" size={24} />
        </div>
      </QuoteSheetLayout>
    );
  }

  return (
    <QuoteSheetLayout
      organizationName={dashboard?.organization.name ?? organizationName}
      customerName={dashboard?.customer.name ?? session?.customerName}
      vehiclePlate={dashboard?.vehicle.plate ?? session?.plate}
      backLink={
        <Link to={routes.home} className="inline-flex items-center gap-1 text-sm text-white/90">
          <ArrowLeft size={16} />
          Voltar
        </Link>
      }
      headerAction={
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
        >
          <Printer size={16} />
          PDF
        </button>
      }
    >
      <QuoteDetailContent
        quote={quote}
        busy={acting}
        onApprove={() => void approve()}
        onReject={() => void reject()}
        showOsLink
        onViewOs={() => navigate(routes.serviceOrder(quote.serviceOrder.id))}
      />
    </QuoteSheetLayout>
  );
}
