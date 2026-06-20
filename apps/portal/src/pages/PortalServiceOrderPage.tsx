import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, ChevronRight, ImageIcon, Loader2, MessageCircle } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import PortalPhotosTab from "../components/portal/PortalPhotosTab";
import { ApiError, api, type PortalServiceOrderDetail } from "../lib/api";
import { formatDateTime, formatMoney } from "../lib/format";
import { routes } from "../lib/routes";
import { osStatusLabel, osStatusToVariant, quoteStatusLabel } from "../lib/service-order-status";
import { quoteNeedsResponse } from "../lib/quote-lines";
import { whatsappUrl, resolveOrganizationWhatsApp } from "../lib/whatsapp";
import { usePortalStore } from "../stores/portalStore";

type ServiceOrderTab = "resumo" | "fotos";

function PortalDetailTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: ServiceOrderTab; label: string; badge?: number }>;
  active: ServiceOrderTab;
  onChange: (tab: ServiceOrderTab) => void;
}) {
  return (
    <div
      className="flex gap-1 p-1 rounded-xl border"
      style={{ borderColor: "var(--portal-border)", backgroundColor: "var(--portal-card-bg, #F8FAFC)" }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-colors ${
            active === tab.id ? "portal-text shadow-sm" : "portal-text-muted"
          }`}
          style={
            active === tab.id
              ? { backgroundColor: "var(--portal-surface, #fff)" }
              : undefined
          }
        >
          {tab.label}
          {tab.badge ? (
            <span className="ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 text-[11px] font-bold text-white" style={{ backgroundColor: "var(--portal-primary)" }}>
              {tab.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export default function PortalServiceOrderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = usePortalStore((s) => s.session);
  const [data, setData] = useState<PortalServiceOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ServiceOrderTab>("resumo");

  const load = useCallback(async () => {
    if (!session?.accessToken || !id) return;
    setError(null);
    try {
      setData(await api.portalServiceOrder(session.accessToken, id));
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "Não foi possível carregar a OS");
    }
  }, [session?.accessToken, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const dashboard = usePortalStore((s) => s.dashboard);
  const whatsapp = resolveOrganizationWhatsApp(
    data?.organization.phone ?? dashboard?.organization.phone,
  );

  const pendingQuotes = data?.quotes.filter((q) => quoteNeedsResponse(q)) ?? [];
  const otherQuotes = data?.quotes.filter((q) => !quoteNeedsResponse(q)) ?? [];
  const photoCount = data?.photos.length ?? 0;

  return (
    <div className="space-y-4 -mt-2">
      <div className="flex items-center gap-2">
        <Link to={routes.orders} className="inline-flex items-center gap-1 text-sm portal-accent">
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <h1 className="portal-text text-xl font-black flex-1">
          {data ? `OS #${data.number}` : "Ordem de serviço"}
        </h1>
      </div>

      {error ? (
        <div className="portal-card p-4 text-sm text-red-600">{error}</div>
      ) : null}

      {!data && !error ? (
        <div className="flex justify-center py-10 portal-text-muted">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : null}

      {data ? (
        <>
          <PortalDetailTabs
            active={tab}
            onChange={setTab}
            tabs={[
              { id: "resumo", label: "Resumo" },
              { id: "fotos", label: "Fotos", badge: photoCount > 0 ? photoCount : undefined },
            ]}
          />

          {tab === "fotos" ? (
            <PortalPhotosTab photos={data.photos} />
          ) : (
            <>
              <section className="portal-card p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <StatusBadge variant={osStatusToVariant(data.status)} />
                  <span className="text-sm font-medium portal-text">{osStatusLabel(data.status)}</span>
                  <span className="text-sm font-bold ml-auto" style={{ color: "var(--portal-primary)" }}>
                    {formatMoney(data.totalAmount)}
                  </span>
                </div>
                {data.complaint ? (
                  <p className="text-sm portal-text-muted">
                    <strong className="portal-text">Reclamação:</strong> {data.complaint}
                  </p>
                ) : null}
                {data.customerVisibleNotes ? (
                  <p className="text-sm portal-text-muted mt-2">
                    <strong className="portal-text">Observações:</strong> {data.customerVisibleNotes}
                  </p>
                ) : null}
                {photoCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setTab("fotos")}
                    className="mt-4 flex w-full h-11 items-center justify-center gap-2 rounded-lg border text-sm font-medium portal-text"
                    style={{ borderColor: "var(--portal-border)" }}
                  >
                    <ImageIcon size={18} />
                    Ver {photoCount} {photoCount === 1 ? "foto" : "fotos"}
                  </button>
                ) : null}
                {whatsapp ? (
                  <a
                    href={whatsappUrl(whatsapp, `Olá! Gostaria de informações sobre a OS #${data.number}.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-[#25D366] text-white text-sm font-medium"
                  >
                    <MessageCircle size={18} />
                    Falar no WhatsApp
                  </a>
                ) : null}
              </section>

              {pendingQuotes.length > 0 ? (
                <section className="portal-card overflow-hidden">
                  <h2 className="px-4 py-3 text-sm font-semibold portal-text border-b" style={{ borderColor: "var(--portal-border)" }}>
                    Orçamento aguardando aprovação
                  </h2>
                  <ul className="divide-y" style={{ borderColor: "var(--portal-border)" }}>
                    {pendingQuotes.map((quote) => (
                      <li key={quote.id}>
                        <button
                          type="button"
                          onClick={() => navigate(routes.quote(quote.id))}
                          className="w-full px-4 py-3 text-left flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-sm font-medium portal-text">
                              Orçamento {quote.number ? `#${quote.number}` : ""}
                            </p>
                            <p className="text-xs portal-text-muted mt-1">
                              {quoteStatusLabel(quote.status)} — toque para ver peças e serviços
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className="font-bold" style={{ color: "var(--portal-primary)" }}>
                              {formatMoney(quote.amount)}
                            </p>
                            <ChevronRight className="portal-text-muted" size={18} />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {otherQuotes.length > 0 ? (
                <section className="portal-card overflow-hidden">
                  <h2 className="px-4 py-3 text-sm font-semibold portal-text border-b" style={{ borderColor: "var(--portal-border)" }}>
                    Orçamentos anteriores
                  </h2>
                  <ul className="divide-y" style={{ borderColor: "var(--portal-border)" }}>
                    {otherQuotes.map((quote) => (
                      <li key={quote.id}>
                        <button
                          type="button"
                          onClick={() => navigate(routes.quote(quote.id))}
                          className="w-full px-4 py-3 text-left"
                        >
                          <div className="flex justify-between items-center gap-3">
                            <div>
                              <p className="text-sm portal-text font-medium">
                                Orçamento {quote.number ? `#${quote.number}` : ""}
                              </p>
                              <p className="text-xs portal-text-muted mt-1">{quoteStatusLabel(quote.status)}</p>
                            </div>
                            <p className="font-bold" style={{ color: "var(--portal-primary)" }}>
                              {formatMoney(quote.amount)}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {data.timeline.length > 0 ? (
                <section className="portal-card overflow-hidden">
                  <h2 className="px-4 py-3 text-sm font-semibold portal-text border-b" style={{ borderColor: "var(--portal-border)" }}>
                    Linha do tempo
                  </h2>
                  <ul className="px-4 py-3 space-y-4">
                    {data.timeline.map((ev) => (
                      <li key={ev.id} className="relative pl-4 border-l-2" style={{ borderColor: "var(--portal-accent)" }}>
                        <p className="text-sm font-medium portal-text">{ev.toLabel}</p>
                        <p className="text-xs portal-text-muted">{formatDateTime(ev.createdAt)}</p>
                        {ev.notes ? <p className="text-xs portal-text-muted mt-1">{ev.notes}</p> : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
