import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { ArrowLeft, Check, Loader2, MessageCircle, X } from "lucide-react";
import PortalShell from "../components/portal/PortalShell";
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

  if (!session?.accessToken) return <Navigate to={routes.login} replace />;

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
    <PortalShell
      title={data ? `OS #${data.number}` : "Ordem de serviço"}
      subtitle={data?.statusLabel}
    >
      <Link
        to={routes.home}
        className="inline-flex items-center gap-1 text-sm text-[#0E7490] -mt-2"
      >
        <ArrowLeft size={16} />
        Voltar ao início
      </Link>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {!data && !error && (
        <div className="flex justify-center py-10 text-[#64748B]">
          <Loader2 className="animate-spin" size={24} />
        </div>
      )}

      {data && (
        <>
          <section className="bg-white rounded-xl p-4 border border-[#E2E8F0]">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <StatusBadge variant={osStatusToVariant(data.status)} />
              <span className="text-sm font-medium">{osStatusLabel(data.status)}</span>
              <span className="text-sm font-bold text-[#0F3D4C] ml-auto">
                {formatMoney(data.totalAmount)}
              </span>
            </div>
            {data.complaint ? (
              <p className="text-sm text-[#64748B]">
                <strong className="text-[#1E293B]">Reclamação:</strong> {data.complaint}
              </p>
            ) : null}
            {data.customerVisibleNotes ? (
              <p className="text-sm text-[#64748B] mt-2">
                <strong className="text-[#1E293B]">Observações:</strong> {data.customerVisibleNotes}
              </p>
            ) : null}
            {phone ? (
              <a
                href={whatsappUrl(
                  phone,
                  `Olá! Gostaria de informações sobre a OS #${data.number}.`,
                )}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-[#25D366] text-white text-sm font-medium"
              >
                <MessageCircle size={18} />
                Falar no WhatsApp
              </a>
            ) : null}
          </section>

          {data.timeline.length > 0 && (
            <section className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
              <h2 className="px-4 py-3 text-sm font-semibold border-b border-[#F1F5F9]">Linha do tempo</h2>
              <ul className="px-4 py-3 space-y-4">
                {data.timeline.map((ev) => (
                  <li key={ev.id} className="relative pl-4 border-l-2 border-[#0E7490]/40">
                    <p className="text-sm font-medium text-[#1E293B]">{ev.toLabel}</p>
                    <p className="text-xs text-[#94A3B8]">{formatDateTime(ev.createdAt)}</p>
                    {ev.notes ? <p className="text-xs text-[#64748B] mt-1">{ev.notes}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.attachments.length > 0 && (
            <section className="bg-white rounded-xl border border-[#E2E8F0] p-4">
              <h2 className="text-sm font-semibold mb-3">Fotos, vídeos e documentos</h2>
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
                      className="block rounded-lg overflow-hidden border border-[#E2E8F0]"
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
                        <div className="h-28 flex items-center justify-center text-xs text-[#64748B] p-2 text-center">
                          {a.fileName}
                        </div>
                      )}
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {data.quotes.length > 0 && (
            <section className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
              <h2 className="px-4 py-3 text-sm font-semibold border-b border-[#F1F5F9]">Orçamentos</h2>
              <ul className="divide-y divide-[#F1F5F9]">
                {data.quotes.map((q) => (
                  <li key={q.id} className="px-4 py-3">
                    <div className="flex justify-between items-start">
                      <StatusBadge variant={quoteStatusVariant(q.status)} />
                      <p className="font-bold text-[#0F3D4C]">{formatMoney(q.amount)}</p>
                    </div>
                    <p className="text-xs text-[#64748B] mt-1">{quoteStatusLabel(q.status)}</p>
                    {(q.status === "PENDING" || q.canRespond) && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={actingId === q.id}
                          onClick={() => approve(q.id)}
                          className="h-10 rounded-lg bg-[#16A34A] text-white text-sm flex items-center justify-center gap-1"
                        >
                          <Check size={16} />
                          Aprovar
                        </button>
                        <button
                          type="button"
                          disabled={actingId === q.id}
                          onClick={() => reject(q.id)}
                          className="h-10 rounded-lg border border-[#DC2626] text-[#DC2626] text-sm flex items-center justify-center gap-1"
                        >
                          <X size={16} />
                          Recusar
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1] p-4 text-center text-sm text-[#64748B]">
            Notas fiscais e documentos fiscais serão exibidos aqui quando o módulo fiscal estiver ativo.
          </section>
        </>
      )}
    </PortalShell>
  );
}
