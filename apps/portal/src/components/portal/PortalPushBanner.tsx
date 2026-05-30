import { useState } from "react";
import { Bell } from "lucide-react";
import { api } from "../../lib/api";
import { subscribePortalPush } from "../../lib/pushSubscribe";
import { usePortalStore } from "../../stores/portalStore";

export default function PortalPushBanner() {
  const token = usePortalStore((s) => s.session?.accessToken);
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (!token || hidden || done || !("Notification" in window)) return null;

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex items-center justify-between gap-3">
      <div className="text-sm">
        <p className="font-semibold text-[#1E293B]">Ativar notificações</p>
        <p className="text-[12px] text-[#64748B]">Saiba quando o orçamento ou status mudar</p>
      </div>
      <button
        type="button"
        className="h-10 px-3 rounded-lg bg-[#0F3D4C] text-white text-sm flex items-center gap-1 shrink-0"
        onClick={async () => {
          const ok = await subscribePortalPush(
            async () => {
              const res = await api.portalVapidPublicKey();
              return res.publicKey;
            },
            async (sub) => {
              if (sub.endpoint && sub.keys?.p256dh && sub.keys?.auth) {
                await api.portalPushSubscribe(token, {
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
                });
              }
            },
          );
          setDone(ok);
          if (!ok) setHidden(true);
        }}
      >
        <Bell size={16} />
        Ativar
      </button>
    </div>
  );
}
