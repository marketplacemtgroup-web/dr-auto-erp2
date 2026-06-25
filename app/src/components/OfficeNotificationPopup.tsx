import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { X } from "lucide-react";
import { api } from "../lib/api";
import { routes } from "../lib/routes";
import { useAuthStore } from "../stores/authStore";
import { useNotificationPolling, type OfficeLiveEvent } from "../contexts/NotificationPollingContext";
import { formatMoney } from "../lib/format";
import { playOfficeNotificationSound } from "../lib/notificationSound";

type PopupItem = OfficeLiveEvent & { id?: string };

export default function OfficeNotificationPopup() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.session?.accessToken);
  const [queue, setQueue] = useState<PopupItem[]>([]);
  const current = queue[0];

  const pushEvent = useCallback((ev: OfficeLiveEvent) => {
    if (ev.type === "quote.approved" || ev.type === "quote.rejected") {
      playOfficeNotificationSound(ev.type === "quote.approved");
      setQueue((q) => [...q, ev]);
    }
  }, []);

  const { subscribe } = useNotificationPolling();

  useEffect(() => {
    return subscribe(pushEvent);
  }, [subscribe, pushEvent]);

  function dismiss() {
    if (!current) return;
    const notifId =
      current.id ?? (current.metadata?.notificationId as string | undefined);
    if (token && notifId) void api.notificationMarkRead(token, notifId);
    setQueue((q) => q.slice(1));
  }

  useEffect(() => {
    if (!current) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [current]);

  if (!current) return null;

  const meta = current.metadata ?? {};
  const osId = meta.serviceOrderId as string | undefined;
  const amount = meta.amount as number | undefined;

  return createPortal(
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={dismiss}
        aria-hidden
      />
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl border-2 bg-white p-5 animate-in fade-in zoom-in-95 ${
          current.type === "quote.rejected" ? "border-[#DC2626]" : "border-[#16A34A]"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="office-notif-title"
      >
        <div className="flex justify-between items-start gap-3 mb-3">
          <p
            id="office-notif-title"
            className={`text-base font-bold ${
              current.type === "quote.rejected" ? "text-[#DC2626]" : "text-[#16A34A]"
            }`}
          >
            {current.title}
          </p>
          <button type="button" onClick={dismiss} className="text-[#94A3B8] hover:text-[#64748B]">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-[#64748B] mb-4 leading-relaxed">{current.message}</p>
        {meta.customerName ? (
          <ul className="text-[13px] space-y-1.5 mb-5 text-[#1E293B] bg-[#F8FAFC] rounded-lg p-3">
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
              className="flex-1 h-11 rounded-lg bg-[#0E7490] text-white text-sm font-semibold hover:bg-[#0c6280]"
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
            className="h-11 px-5 rounded-lg border border-[#E2E8F0] text-sm font-medium hover:bg-[#F8FAFC]"
            onClick={dismiss}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
