import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { api, ApiError } from "../../lib/api";
import BrandHeader from "../../components/BrandHeader";
import { branding } from "../../lib/branding";
import { portalLoginUrl } from "../../lib/routes";
import { useAuthStore } from "../../stores/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setupInfo = (location.state as { info?: string } | null)?.info;
  const session = useAuthStore((s) => s.session);
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [canRegister, setCanRegister] = useState(!branding.singleTenant);

  useEffect(() => {
    if (!branding.singleTenant) return;
    api
      .authSetupStatus()
      .then((s) => setCanRegister(s ? !s.hasOrganization : true))
      .catch(() => setCanRegister(true));
  }, []);

  if (session?.accessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div
        className="hidden lg:flex lg:w-1/2 relative items-end p-12 brand-watermark-bg brand-watermark-bg--hero overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0F172A 0%, #0E7490 50%, #134E4A 100%)",
        }}
      >
        <div className="relative z-10 text-white max-w-md">
          <h2 className="mb-3 font-sans text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
              {branding.appName}
            </span>
            {branding.appTagline}
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Controle ordens de serviço, orçamentos, estoque e comunicação com o cliente em um só lugar.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-[#F8FAFC] px-4 sm:px-6 py-8 sm:py-12 min-h-[100dvh] brand-watermark-bg brand-watermark-bg--login">
        <div className="w-full max-w-md mx-auto">
          <BrandHeader context="auth" className="mb-6 sm:mb-8" />

          <h1 className="text-2xl font-semibold text-[#1E293B] mb-1">Entrar</h1>
          <p className="text-[#64748B] text-sm mb-6">
            Acesse o painel da sua oficina
          </p>

          {setupInfo && (
            <p className="text-sm text-[#0E7490] bg-cyan-50 border border-cyan-200 px-3 py-2 rounded-lg mb-4">
              {setupInfo}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#0E7490] focus:ring-1 focus:ring-[#0E7490]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1.5">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#0E7490] focus:ring-1 focus:ring-[#0E7490]"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-[#DC2626] bg-[#FEF2F2] px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-[#0F3D4C] hover:bg-[#0E7490] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {canRegister && (
            <p className="mt-6 text-center text-sm text-[#64748B]">
              Primeiro acesso?{" "}
              <Link to="/cadastro" className="text-[#0E7490] font-medium hover:underline">
                Configurar {branding.defaultOrganizationName}
              </Link>
            </p>
          )}

          <p className="mt-3 text-center text-sm text-[#94A3B8]">
            Você é cliente?{" "}
            <a
              href={portalLoginUrl()}
              className="text-[#0E7490] font-medium hover:underline"
            >
              Abrir portal do cliente
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
