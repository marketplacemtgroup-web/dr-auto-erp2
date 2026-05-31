import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Settings2 } from "lucide-react";
import { useAutoPwaInstallPrompt } from "../hooks/useAutoPwaInstallPrompt";
import { branding } from "../lib/branding";
import { ApiError } from "../lib/api";
import { dashboardLoginUrl, routes } from "../lib/routes";
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
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 8);
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
    <div className="min-h-screen flex">
      <div
        className="hidden lg:flex lg:w-1/2 relative items-end p-12"
        style={{
          background:
            "linear-gradient(135deg, #0F172A 0%, #0E7490 50%, #134E4A 100%)",
        }}
      >
        <div className="relative z-10 text-white max-w-md">
          <h2 className="text-3xl font-bold mb-3">Portal do Cliente</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Acompanhe seu veículo e aprove ou recuse orçamentos usando CPF e placa.
          </p>
        </div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542362567-b07e54358753?w=1200&q=80')] bg-cover bg-center opacity-20" />
      </div>

      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[#0E7490] flex items-center justify-center">
              <Settings2 size={22} className="text-white" strokeWidth={1.5} />
            </div>
            <div>
              <span className="text-[#1E293B] text-lg font-bold block">{branding.appName}</span>
              <span className="text-[#64748B] text-[10px] uppercase tracking-widest">
                Portal do Cliente
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-[#1E293B] mb-1">Acessar</h1>
          <p className="text-[#64748B] text-sm mb-4">
            Entre com seu CPF e a placa do veículo
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1.5">
                CPF
              </label>
              <input
                value={cpf}
                onChange={(e) => setCpf(maskCpfDigits(e.target.value))}
                className="w-full h-11 px-3 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#0E7490] focus:ring-1 focus:ring-[#0E7490]"
                inputMode="numeric"
                placeholder="000.000.000-00"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1.5">
                Placa (senha)
              </label>
              <input
                value={plate}
                onChange={(e) => setPlate(normalizePlateInput(e.target.value))}
                className="w-full h-11 px-3 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#0E7490] focus:ring-1 focus:ring-[#0E7490]"
                placeholder="ABC-1234"
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

          <p className="mt-6 text-center text-sm text-[#64748B]">
            É da oficina?{" "}
            <a
              href={dashboardLoginUrl()}
              className="text-[#0E7490] font-medium hover:underline"
            >
              Abrir o sistema Scalibur (ERP)
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

