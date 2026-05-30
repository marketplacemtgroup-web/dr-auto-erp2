import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { Loader2 } from "lucide-react";
import { ApiError } from "../lib/api";
import { routes } from "../lib/routes";
import { usePortalStore } from "../stores/portalStore";

export default function PortalAccessPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const loginByAccessToken = usePortalStore((s) => s.loginByAccessToken);
  const session = usePortalStore((s) => s.session);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        setError("Servidor não respondeu. Confira se a API está ligada e tente de novo.");
      }
    }, 16_000);
    void loginByAccessToken(token)
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? String(err.message) : "Link inválido ou expirado",
          );
        }
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token, loginByAccessToken]);

  if (session?.accessToken && !error) {
    return <Navigate to={routes.home} replace />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-6">
        <div className="bg-white rounded-xl p-6 max-w-sm text-center shadow-sm">
          <p className="text-[#DC2626] font-medium">{error}</p>
          <button
            type="button"
            className="mt-4 text-[#0E7490] text-sm underline"
            onClick={() => navigate(routes.login)}
          >
            Entrar com CPF e placa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center gap-2 text-[#64748B]">
      <Loader2 className="animate-spin" size={24} />
      Abrindo portal...
    </div>
  );
}
