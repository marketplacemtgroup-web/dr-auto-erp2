import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Bell,
  Calculator,
  ChevronRight,
  ClipboardList,
  Headphones,
  Loader2,
} from "lucide-react";
import EmptyState from "../components/portal/EmptyState";
import QuoteActionCard from "../components/portal/QuoteActionCard";
import QuickServiceGrid from "../components/portal/QuickServiceGrid";
import VehicleCard from "../components/portal/VehicleCard";
import { ApiError, api, type PortalQuoteRow } from "../lib/api";
import { buildApprovePayload, quoteNeedsResponse } from "../lib/quote-lines";
import { formatMoney } from "../lib/format";
import {
  hasPendingQuote,
  isAwaitingApproval,
  isInProgress,
} from "../lib/portal-status";
import { osStatusLabel } from "../lib/service-order-status";
import { routes } from "../lib/routes";
import { usePortalStore } from "../stores/portalStore";

type PortalQuote = PortalQuoteRow & { canRespond?: boolean };

export default function PortalHomePage() {
  const navigate = useNavigate();
  const session = usePortalStore((s) => s.session);
  const dashboard = usePortalStore((s) => s.dashboard);
  const refresh = usePortalStore((s) => s.refresh);
  const [actingId, setActingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedForToken = useRef<string | null>(null);

  const quotes = (dashboard?.quotes ?? []) as PortalQuote[];
  const pending = useMemo(
    () => quotes.filter((q) => quoteNeedsResponse(q)),
    [quotes],
  );

  const activeOs = useMemo(
    () => dashboard?.serviceOrders.find((so) => isInProgress(so.status)) ?? null,
    [dashboard?.serviceOrders],
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
      setError(
        err instanceof ApiError
          ? String(err.message)
          : err instanceof Error
            ? err.message
            : "Erro ao carregar dados",
      );
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!session?.accessToken) return;
    if (fetchedForToken.current === session.accessToken && dashboard) return;
    void syncDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  async function approve(id: string) {
    if (!session?.accessToken) return;
    const quote = quotes.find((q) => q.id === id);
    const payload = buildApprovePayload(quote?.lines ?? []);
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

  const customerName = dashboard?.customer.name ?? session?.customerName ?? "Cliente";
  const showBudgetShortcut =
    activeOs &&
    isAwaitingApproval(activeOs.status) &&
    hasPendingQuote(quotes, activeOs.id);

  const pendingQuoteForActiveOs = useMemo(
    () =>
      activeOs
        ? quotes.find(
            (q) =>
              q.serviceOrder.id === activeOs.id && quoteNeedsResponse(q),
          )
        : null,
    [activeOs, quotes],
  );

  const quickItems = [
    {
      title: "Minhas OS",
      icon: ClipboardList,
      onClick: () => navigate(routes.orders),
    },
    {
      title: showBudgetShortcut ? "Aprovar Orçamento" : "Preços",
      icon: Calculator,
      onClick: () => {
        if (pendingQuoteForActiveOs) {
          navigate(routes.quote(pendingQuoteForActiveOs.id));
        } else if (activeOs && showBudgetShortcut) {
          navigate(routes.serviceOrder(activeOs.id));
        } else {
          navigate(routes.orders);
        }
      },
    },
    {
      title: "Notificações",
      icon: Bell,
      onClick: () => navigate(routes.notifications),
    },
    {
      title: "Falar c/ Suporte",
      icon: Headphones,
      onClick: () => navigate(routes.profileSupport),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="portal-text text-2xl font-black">Olá, {customerName}</h1>
        <p className="portal-text-muted text-sm mt-1">Bem-vindo(a) ao seu portal</p>
      </div>

      {refreshing && dashboard ? (
        <p className="portal-text-muted text-xs text-center">Atualizando...</p>
      ) : null}

      {error ? (
        <div className="portal-card p-4 text-sm text-red-600">
          {error}
          <button type="button" className="block mt-2 underline" onClick={() => void syncDashboard(true)}>
            Tentar novamente
          </button>
        </div>
      ) : null}

      {!dashboard && refreshing && !error ? (
        <div className="portal-card p-6 flex items-center justify-center gap-2 portal-text-muted text-sm">
          <Loader2 size={18} className="animate-spin" />
          Carregando...
        </div>
      ) : null}

      {dashboard ? (
        <>
          <VehicleCard vehicle={dashboard.vehicle} />

          {activeOs ? (
            <button
              type="button"
              onClick={() => navigate(routes.serviceOrder(activeOs.id))}
              className="portal-card w-full p-4 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="portal-text-muted text-xs uppercase font-semibold">OS ativa</p>
                  <p className="portal-text font-bold text-lg">OS #{activeOs.number}</p>
                  <p className="portal-accent text-sm mt-1">{osStatusLabel(activeOs.status)}</p>
                </div>
                <div className="text-right">
                  <p className="portal-text font-bold">{formatMoney(activeOs.totalAmount)}</p>
                  <ChevronRight className="ml-auto mt-2 portal-text-muted" size={20} />
                </div>
              </div>
            </button>
          ) : (
            <div className="portal-card">
              <EmptyState
                icon={ClipboardList}
                title="Nenhuma Ordem de Serviço Ativa"
                description="Seu veículo não possui manutenções pendentes de aprovação ou em andamento neste momento."
              />
            </div>
          )}

          {pending.length > 0 ? (
            <section className="space-y-3">
              <h2 className="portal-text text-sm font-semibold">
                Aguardando sua aprovação ({pending.length})
              </h2>
              {pending.map((q) => (
                <QuoteActionCard
                  key={q.id}
                  quote={q}
                  busy={actingId === q.id}
                  onOpen={() => navigate(routes.quote(q.id))}
                  onApprove={() => approve(q.id)}
                  onReject={() => reject(q.id)}
                />
              ))}
            </section>
          ) : null}

          <section>
            <h2 className="portal-text font-bold mb-3">Serviços Rápidos</h2>
            <QuickServiceGrid items={quickItems} />
          </section>
        </>
      ) : null}
    </div>
  );
}
