import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { api, ApiError } from "../../lib/api";
import BrandLogo from "../../components/BrandLogo";
import { branding } from "../../lib/branding";
import { useAuthStore } from "../../stores/authStore";

export default function RegisterOrganizationPage() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const registerOrganization = useAuthStore((s) => s.registerOrganization);
  const [blocked, setBlocked] = useState(false);
  const [form, setForm] = useState({
    organizationName: branding.defaultOrganizationName,
    tradeName: branding.appName,
    document: "",
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .authSetupStatus()
      .then((s) => {
        if (s?.hasOrganization) setBlocked(true);
      })
      .catch(() => setBlocked(true));
  }, []);

  if (session?.accessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  if (blocked) {
    return <Navigate to="/login" replace />;
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registerOrganization(form);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError ? String(err.message) : "Falha no cadastro",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] px-4 py-10 brand-watermark-bg">
      <div className="w-full max-w-lg bg-white rounded-2xl card-shadow p-8">
        <div className="flex items-center gap-3 mb-6">
          <BrandLogo size="md" />
          <div>
            <span className="text-[#1E293B] text-lg font-bold block">{branding.appName}</span>
            <span className="text-[#64748B] text-[10px] uppercase tracking-widest">
              Configuração inicial
            </span>
          </div>
        </div>

        <p className="text-[13px] text-[#64748B] mb-4">
          Crie o administrador da <strong>{branding.defaultOrganizationName}</strong>.
          Este passo só é feito uma vez nesta instalação.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            ["organizationName", "Nome da oficina", "text"],
            ["tradeName", "Nome fantasia", "text"],
            ["document", "CNPJ", "text"],
            ["name", "Seu nome", "text"],
            ["email", "E-mail", "email"],
            ["phone", "Telefone", "tel"],
            ["password", "Senha", "password"],
          ].map(([key, label, type]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                {label}
              </label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => update(key, e.target.value)}
                readOnly={key === "organizationName" && branding.singleTenant}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#0E7490] read-only:bg-[#F8FAFC]"
                required={
                  key === "name" || key === "email" || key === "password"
                }
              />
            </div>
          ))}
          {error && (
            <p className="text-sm text-[#DC2626] bg-[#FEF2F2] px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg bg-[#0F3D4C] hover:bg-[#0E7490] text-white text-sm font-medium mt-2"
          >
            {loading ? "Criando..." : "Ativar sistema"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[#64748B]">
          Já tem conta?{" "}
          <Link to="/login" className="text-[#0E7490] font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
