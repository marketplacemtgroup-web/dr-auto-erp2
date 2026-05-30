import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { X } from "lucide-react";
import { api } from "../lib/api";
import { routes } from "../lib/routes";
import { useAuthStore } from "../stores/authStore";
import { useOfficeEvents, type OfficeLiveEvent } from "../hooks/useOfficeEvents";
import { formatMoney } from "../lib/format";

type PopupItem = OfficeLiveEvent & { id?: string };

export default function OfficeNotificationPopup() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.session?.accessToken);
  const [queue, setQueue] = useState<PopupItem[]>([]);
  const current = queue[0];

  const pushEvent = useCallback((ev: OfficeLiveEvent) => {
    if (ev.type === "quote.approved" || ev.type === "quote.rejected") {
      setQueue((q) => [...q, ev]);
    }
  }, []);

  useOfficeEvents(pushEvent);

  useEffect(() => {
    if (!token) return;
    void api.notificationsUnread(token).then((rows) => {
      const unread = rows.filter((r) => r.type.startsWith("quote."));
      if (unread.length) {
        setQueue((q) => [
          ...unread.map((r) => ({
            type: r.type,
            title: r.title,
            message: r.message,
            metadata: r.metadata as Record<string, unknown>,
            createdAt: r.createdAt,
            id: r.id,
          })),
          ...q,
        ]);
      }
    });
  }, [token]);

  if (!current) return null;

  const meta = current.metadata ?? {};
  const osId = meta.serviceOrderId as string | undefined;
  const amount = meta.amount as number | undefined;

  function dismiss() {
    const notifId =
      current.id ?? (current.metadata?.notificationId as string | undefined);
    if (token && notifId) void api.notificationMarkRead(token, notifId);
    setQueue((q) => q.slice(1));
  }

  return (
    <div className="fixed bottom-6 right-6 z-[200] w-full max-w-sm animate-in slide-in-from-bottom-4">
      <div className="bg-white rounded-xl shadow-2xl border-2 border-[#16A34A] p-4">
        <div className="flex justify-between items-start gap-2 mb-2">
          <p className="text-sm font-bold text-[#16A34A]">{current.title}</p>
          <button type="button" onClick={dismiss} className="text-[#94A3B8]">
            <X size={18} />
          </button>
        </div>
        <p className="text-[13px] text-[#64748B] mb-3">{current.message}</p>
        {meta.customerName ? (
          <ul className="text-[12px] space-y-1 mb-3 text-[#1E293B]">
            <li>
              <strong>Cliente:</strong> {String(meta.customerName)}
            </li>
            {meta.plate ? (
              <li>
                <strong>Placa:</strong> {String(meta.plate)}
              </li>
            ) : null}
            {meta.serviceOrderNumber ? (
              <li>
                <strong>OS:</strong> #{String(meta.serviceOrderNumber)}
              </li>
            ) : null}
            {amount != null ? (
              <li>
                <strong>Valor:</strong> {formatMoney(amount)}
              </li>
            ) : null}
          </ul>
        ) : null}
        <div className="flex gap-2">
          {osId ? (
            <button
              type="button"
              className="flex-1 h-10 rounded-lg bg-[#0E7490] text-white text-sm font-medium"
              onClick={() => {
                dismiss();
                navigate(routes.ordemDeServicoDetalhe(osId));
              }}
            >
              Abrir OS
            </button>
          ) : null}
          <button
            type="button"
            className="h-10 px-4 rounded-lg border border-[#E2E8F0] text-sm"
            onClick={dismiss}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
