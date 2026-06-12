import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Check, Loader2, MessageCircle, X } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import { ApiError, api, type PortalServiceOrderDetail } from "../lib/api";
import { formatDateTime, formatMoney } from "../lib/format";
import { resolveMediaUrl } from "../lib/mediaUrl";
import { isImageMime, isVideoMime } from "../lib/mediaTypes";
import { routes } from "../lib/routes";
import { osStatusLabel, osStatusToVariant, quoteStatusLabel, quoteStatusVariant } from "../lib/service-order-status";
import { whatsappUrl } from "../lib/whatsapp";
import { usePortalStore } from "../stores/portalStore";

export default function PortalServiceOrderPage() {
  const { id } = useParams<{ id: string }>();
  const session = usePortalStore((s) => s.session);
  const [data, setData] = useState<PortalServiceOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

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

  const phone = data?.customer.whatsapp || data?.customer.phone || data?.organization.phone;

  async function approve(quoteId: string) {
    if (!session?.accessToken) return;
    const quote = data?.quotes.find((q) => q.id === quoteId);
    const payload =
      quote?.lines && quote.lines.length > 0
        ? { lines: quote.lines.map((l) => ({ lineId: l.id, approved: true })) }
        : undefined;
    setActingId(quoteId);
    try {
      await api.portalApprove(session.accessToken, quoteId, payload);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao aprovar");
    } finally {
      setActingId(null);
    }
  }

  async function reject(quoteId: string) {
    if (!session?.accessToken || !confirm("Recusar este orçamento?")) return;
    setActingId(quoteId);
    try {
      await api.portalReject(session.accessToken, quoteId);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao recusar");
    } finally {
      setActingId(null);
    }
  }

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
            {phone ? (
              <a
                href={whatsappUrl(phone, `Olá! Gostaria de informações sobre a OS #${data.number}.`)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-[#25D366] text-white text-sm font-medium"
              >
                <MessageCircle size={18} />
                Falar no WhatsApp
              </a>
            ) : null}
          </section>

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

          {data.attachments.length > 0 ? (
            <section className="portal-card p-4">
              <h2 className="text-sm font-semibold portal-text mb-3">Fotos, vídeos e documentos</h2>
              <div className="grid grid-cols-2 gap-2">
                {data.attachments.map((a) => {
                  const src = resolveMediaUrl(a.url);
                  const isImage = isImageMime(a.mimeType);
                  const isVideo = isVideoMime(a.mimeType);
                  return (
                    <a
                      key={a.id}
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg overflow-hidden border"
                      style={{ borderColor: "var(--portal-border)" }}
                    >
                      {isImage ? (
                        <img src={src} alt={a.fileName} className="w-full h-28 object-cover" />
                      ) : isVideo ? (
                        <video
                          src={src}
                          controls
                          className="w-full h-28 object-cover bg-black"
                          preload="metadata"
                        />
                      ) : (
                        <div className="h-28 flex items-center justify-center text-xs portal-text-muted p-2 text-center">
                          {a.fileName}
                        </div>
                      )}
                    </a>
                  );
                })}
              </div>
            </section>
          ) : null}

          {data.quotes.length > 0 ? (
            <section className="portal-card overflow-hidden">
              <h2 className="px-4 py-3 text-sm font-semibold portal-text border-b" style={{ borderColor: "var(--portal-border)" }}>
                Orçamentos
              </h2>
              <ul className="divide-y" style={{ borderColor: "var(--portal-border)" }}>
                {data.quotes.map((q) => (
                  <li key={q.id} className="px-4 py-3">
                    <div className="flex justify-between items-start">
                      <StatusBadge variant={quoteStatusVariant(q.status)} />
                      <p className="font-bold" style={{ color: "var(--portal-primary)" }}>
                        {formatMoney(q.amount)}
                      </p>
                    </div>
                    <p className="text-xs portal-text-muted mt-1">{quoteStatusLabel(q.status)}</p>
                    {(q.status === "PENDING" || q.canRespond) ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={actingId === q.id}
                          onClick={() => approve(q.id)}
                          className="h-10 rounded-lg bg-green-600 text-white text-sm flex items-center justify-center gap-1"
                        >
                          <Check size={16} />
                          Aprovar
                        </button>
                        <button
                          type="button"
                          disabled={actingId === q.id}
                          onClick={() => reject(q.id)}
                          className="h-10 rounded-lg border border-red-600 text-red-600 text-sm flex items-center justify-center gap-1"
                        >
                          <X size={16} />
                          Recusar
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
