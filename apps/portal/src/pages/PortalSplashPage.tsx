import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { Loader2 } from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import MotoBackground from "../components/portal/MotoBackground";
import { routes } from "../lib/routes";
import { usePortalStore } from "../stores/portalStore";

const MESSAGES = [
  "Carregando...",
  "Conectando ao sistema...",
  "Iniciando acompanhamento em tempo real...",
];

export default function PortalSplashPage() {
  const session = usePortalStore((s) => s.session);
  const refresh = usePortalStore((s) => s.refresh);
  const [done, setDone] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setMsgIndex(1), 1000),
      window.setTimeout(() => setMsgIndex(2), 2000),
      window.setTimeout(() => setDone(true), 2600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (session?.accessToken) {
      void refresh();
    }
  }, [session?.accessToken, refresh]);

  if (!done) {
    return (
      <MotoBackground>
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center safe-area-top safe-area-bottom">
          <BrandLogo context="auth" className="mb-6" />
          <p className="portal-text-muted text-sm tracking-widest uppercase">Portal do Cliente</p>
          <Loader2
            className="animate-spin mt-10 mb-4"
            size={28}
            style={{ color: "var(--portal-accent)" }}
          />
          <p className="portal-text-muted text-sm">{MESSAGES[msgIndex]}</p>
          <p className="portal-text-muted text-[11px] mt-auto pt-16 opacity-60">
            Seu cliente acompanha tudo pelo portal
          </p>
        </div>
      </MotoBackground>
    );
  }

  if (session?.accessToken) {
    return <Navigate to={routes.home} replace />;
  }

  return <Navigate to={routes.login} replace />;
}
