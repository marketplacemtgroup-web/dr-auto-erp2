import { useState } from "react";
import { Lock, Loader2, User } from "lucide-react";
import { Navigate, useNavigate } from "react-router";
import { useAutoPwaInstallPrompt } from "../hooks/useAutoPwaInstallPrompt";
import BrandLogo from "../components/BrandLogo";
import MotoBackground from "../components/portal/MotoBackground";
import ThemeToggle from "../components/portal/ThemeToggle";
import { ApiError } from "../lib/api";
import { routes } from "../lib/routes";
import { usePortalStore } from "../stores/portalStore";

function maskCpfDigits(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const parts = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 9),
    digits.slice(9, 11),
  ].filter(Boolean);
  if (digits.length <= 3) return parts[0] ?? "";
  if (digits.length <= 6) return `${parts[0]}.${parts[1] ?? ""}`;
  if (digits.length <= 9) return `${parts[0]}.${parts[1]}.${parts[2] ?? ""}`;
  return `${parts[0]}.${parts[1]}.${parts[2]}-${parts[3] ?? ""}`;
}

function normalizePlateInput(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

export default function PortalLoginPage() {
  useAutoPwaInstallPrompt(true);

  const navigate = useNavigate();
  const session = usePortalStore((s) => s.session);
  const login = usePortalStore((s) => s.login);
  const [cpf, setCpf] = useState("");
  const [plate, setPlate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (session?.accessToken) return <Navigate to={routes.home} replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(cpf, plate);
      navigate(routes.home);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "Falha no acesso");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MotoBackground>
      <div className="min-h-screen flex flex-col safe-area-top safe-area-bottom px-5 py-6">
        <div className="flex justify-start">
          <ThemeToggle />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
          <BrandLogo context="auth" className="mb-4" />

          <h1 className="portal-text text-2xl font-black text-center mb-2">
            Acesse seu acompanhamento
          </h1>
          <p className="portal-text-muted text-sm text-center mb-8 max-w-sm">
            Digite seu CPF e a placa do seu veículo para acompanhar sua ordem de serviço.
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <label className="block">
              <span className="sr-only">CPF</span>
              <div className="portal-card flex items-center gap-3 px-4 h-12">
                <User size={20} style={{ color: "var(--portal-accent)" }} />
                <input
                  value={cpf}
                  onChange={(e) => setCpf(maskCpfDigits(e.target.value))}
                  className="flex-1 bg-transparent outline-none portal-text text-sm placeholder:portal-text-muted"
                  inputMode="numeric"
                  placeholder="CPF"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="sr-only">Placa</span>
              <div className="portal-card flex items-center gap-3 px-4 h-12">
                <Lock size={20} style={{ color: "var(--portal-accent)" }} />
                <input
                  value={plate}
                  onChange={(e) => setPlate(normalizePlateInput(e.target.value))}
                  className="flex-1 bg-transparent outline-none portal-text text-sm placeholder:portal-text-muted uppercase"
                  placeholder="Placa"
                  required
                />
              </div>
            </label>

            {error ? (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-60 portal-primary-bg"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Entrando...
                </span>
              ) : (
                "Acessar portal"
              )}
            </button>
          </form>

          <p className="portal-card portal-text text-sm font-medium mt-6 text-center max-w-sm mx-auto px-4 py-3 leading-relaxed">
            Não encontrou sua OS? Entre em contato com a oficina pelo telefone ou WhatsApp que
            você recebeu.
          </p>
        </div>

        <p className="portal-card portal-text text-xs font-medium text-center mt-4 mx-auto max-w-sm px-4 py-2.5 leading-relaxed">
          Precisa de ajuda? Fale com a oficina.
        </p>
      </div>
    </MotoBackground>
  );
}
