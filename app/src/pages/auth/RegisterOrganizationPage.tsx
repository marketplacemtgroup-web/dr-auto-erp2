import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { ImagePlus, X } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import BrandHeader from "../../components/BrandHeader";
import LoginUsernameField from "../../components/team/LoginUsernameField";
import { branding } from "../../lib/branding";
import { formatLoginPreview, suggestLoginEmailDomain } from "../../lib/loginEmail";
import { useAuthStore } from "../../stores/authStore";
import { useBrandingStore } from "../../stores/brandingStore";

const LOGO_ACCEPT = "image/png,image/jpeg,image/jpg,image/webp";

export default function RegisterOrganizationPage() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const registerOrganization = useAuthStore((s) => s.registerOrganization);
  const applyBranding = useBrandingStore((s) => s.apply);
  const fileRef = useRef<HTMLInputElement>(null);
  const [blocked, setBlocked] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusWarning, setStatusWarning] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [domainTouched, setDomainTouched] = useState(false);
  const [form, setForm] = useState({
    organizationName: "",
    tradeName: branding.appName,
    document: "",
    name: "",
    loginUsername: "admin",
    loginEmailDomain: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .authSetupStatus()
      .then((s) => {
        if (s?.hasOrganization) {
          setBlocked(true);
          return;
        }
        if (s?.error || s?.hint || s?.dbReady === false) {
          setStatusWarning(
            [s.hint, s.error].filter(Boolean).join(" — ") ||
              "Banco sem schema na API. Corrija DATABASE_URL na Vercel (sem aspas) e redeploy.",
          );
        }
      })
      .catch(() => {
        setStatusWarning(
          "API indisponível. Confira /api/env-check na URL da sua API — remova aspas de DATABASE_URL e DIRECT_URL na Vercel (projeto API) e redeploy.",
        );
      })
      .finally(() => setStatusLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  if (session?.accessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!statusLoading && blocked) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          info: "A oficina já está configurada neste banco. Entre com o e-mail e senha do administrador.",
        }}
      />
    );
  }

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] text-sm text-[#64748B]">
        Verificando instalação...
      </div>
    );
  }

  function update(field: string, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "organizationName" && !domainTouched) {
        next.loginEmailDomain = suggestLoginEmailDomain(value);
      }
      return next;
    });
  }

  function handleLogoChange(file: File | null) {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    if (!file) {
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }
    const allowed = LOGO_ACCEPT.split(",");
    if (!allowed.includes(file.type)) {
      setError("Logo inválido. Use PNG, JPEG, JPG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Logo muito grande. Máximo 5 MB.");
      return;
    }
    setError("");
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registerOrganization(form, logoFile);
      const brandingData = await api.publicBranding();
      applyBranding(brandingData);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError ? String(err.message) : "Falha no cadastro",
      );
    } finally {
      setLoading(false);
    }
  }

  const loginPreview = formatLoginPreview(form.loginUsername, form.loginEmailDomain);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] px-4 py-10 brand-watermark-bg">
      <div className="w-full max-w-lg bg-white rounded-2xl card-shadow p-8">
        <BrandHeader context="auth" className="mb-6" subtitle="Configuração inicial" />

        <p className="text-[13px] text-[#64748B] mb-4">
          Crie o administrador da sua oficina. Este passo só é feito uma vez nesta instalação.
        </p>

        {statusWarning && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mb-4">
            {statusWarning}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1.5">
              Logo da oficina
            </label>
            <input
              ref={fileRef}
              type="file"
              accept={LOGO_ACCEPT}
              className="hidden"
              onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
            />
            {logoPreview ? (
              <div className="relative border border-[#E2E8F0] rounded-xl p-4 flex items-center justify-center bg-[#F8FAFC]">
                <img src={logoPreview} alt="Prévia do logo" className="max-h-28 object-contain" />
                <button
                  type="button"
                  onClick={() => {
                    handleLogoChange(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#DC2626]"
                  aria-label="Remover logo"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-24 border-2 border-dashed border-[#CBD5E1] rounded-xl flex flex-col items-center justify-center gap-2 text-[#64748B] hover:border-[#0E7490] hover:text-[#0E7490] transition-colors"
              >
                <ImagePlus size={24} />
                <span className="text-xs font-medium">Enviar logo (PNG, JPG ou WebP)</span>
              </button>
            )}
            <p className="text-[11px] text-[#94A3B8] mt-1">
              O logo aparecerá no ERP, no portal do cliente e nas impressões.
            </p>
          </div>

          {[
            ["organizationName", "Nome da oficina", "text"],
            ["tradeName", "Nome fantasia", "text"],
            ["document", "CNPJ", "text"],
            ["name", "Seu nome", "text"],
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
                placeholder={
                  key === "organizationName"
                    ? branding.defaultOrganizationName
                    : undefined
                }
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#0E7490]"
                required={key === "organizationName" || key === "name" || key === "password"}
              />
            </div>
          ))}

          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-[#334155]">Acesso ao sistema</p>
              <p className="text-xs text-[#64748B] mt-1">
                Defina o domínio de login da oficina. Depois, ao cadastrar funcionários, você
                informará só o nome antes do @.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                Domínio de login da oficina *
              </label>
              <div className="flex items-stretch rounded-lg border border-[#E2E8F0] overflow-hidden bg-white focus-within:border-[#0E7490]">
                <span className="inline-flex items-center px-3 text-sm text-[#64748B] border-r border-[#E2E8F0]">
                  @
                </span>
                <input
                  type="text"
                  value={form.loginEmailDomain}
                  onChange={(e) => {
                    setDomainTouched(true);
                    update("loginEmailDomain", e.target.value);
                  }}
                  className="flex-1 h-10 px-3 text-sm focus:outline-none"
                  placeholder="oficinadobeto.local"
                  required
                />
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Sugerido a partir do nome da oficina. Todos os logins usarão este domínio.
              </p>
            </div>

            <LoginUsernameField
              label="Seu usuário de administrador *"
              username={form.loginUsername}
              domain={form.loginEmailDomain}
              onUsernameChange={(value) => update("loginUsername", value)}
              placeholder="admin"
              required
            />

            {loginPreview && (
              <p className="text-xs text-[#475569] bg-white border border-[#E2E8F0] rounded-lg px-3 py-2">
                Você entrará com: <strong>{loginPreview}</strong>
              </p>
            )}
          </div>

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
