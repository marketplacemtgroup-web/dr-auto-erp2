import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "../stores/authStore";

function useAuthPersistHydrated() {
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    const fallback = window.setTimeout(() => setHydrated(true), 800);
    return () => {
      unsub();
      window.clearTimeout(fallback);
    };
  }, []);

  return hydrated;
}

export default function ProtectedRoute() {
  const session = useAuthStore((s) => s.session);
  const hydrated = useAuthPersistHydrated();
  const location = useLocation();

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] brand-watermark-bg">
        <p className="text-sm text-[#64748B]">Carregando...</p>
      </div>
    );
  }

  if (!session?.accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
