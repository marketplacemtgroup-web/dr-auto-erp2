import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass } from "../../components/modules/FormDrawer";
import { branding, subscription } from "../../lib/branding";
import { resolveAssetUrl } from "../../lib/assetUrl";
import { api, ApiError, type AuditLogRow, type BranchRow, type OrganizationDetail } from "../../lib/api";
import { fetchAddressByCep, formatCepInput, normalizeCep } from "../../lib/cep";
import { useAuthStore } from "../../stores/authStore";
import { useBrandingStore } from "../../stores/brandingStore";
import { routes } from "../../lib/routes";

const LOGO_ACCEPT = "image/png,image/jpeg,image/jpg,image/webp";

const AUDIT_LABELS: Record<string, string> = {
  login: "Login",
  "settings.update": "Configuracoes alteradas",
  "customer.update": "Cliente atualizado",
  "customer.delete": "Cliente excluido",
  "service_order.status_change": "Status da OS",
  "service_order.amount_change": "Valor da OS",
  "service_order.delete": "OS excluida",
  "financial.pay": "Pagamento baixado",
  "financial.delete": "Lancamento financeiro excluido",
};

function formatAuditDetail(log: {
  action: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  resource?: string | null;
}): string {
  const meta = log.metadata ?? {};
  if (log.action === "financial.delete") {
    const description = typeof meta.description === "string" ? meta.description : "Lancamento";
    const amount =
      typeof meta.amount === "number"
        ? meta.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : null;
    const parts = [description, amount].filter(Boolean);
    return parts.join(" · ");
  }
  if (log.metadata && Object.keys(log.metadata).length > 0) {
    return JSON.stringify(log.metadata);
  }
  return log.resource ?? "—";
}

function mainBranch(org?: OrganizationDetail | null): BranchRow | undefined {
  return org?.branches?.find((b) => b.isMain) ?? org?.branches?.[0];
}

function branchAddressLabel(branch?: BranchRow): string | null {
  if (!branch) return null;
  if (branch.address) return branch.address;
  const parts = [
    [branch.street, branch.addressNumber].filter(Boolean).join(", "),
    branch.district,
    branch.city && branch.state ? `${branch.city}/${branch.state}` : branch.city || branch.state,
    branch.zipCode ? `CEP ${branch.zipCode}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" - ") : null;
}

function orgToForm(org: OrganizationDetail) {
  const branch = mainBranch(org);
  return {
    name: org.name ?? "",
    tradeName: org.tradeName ?? "",
    document: org.document ?? "",
    email: org.email ?? "",
    phone: org.phone ?? "",
    logoUrl: org.logoUrl ?? "",
    primaryColor: org.primaryColor ?? "#0E7490",
    accentColor: org.accentColor ?? "#0F3D4C",
    footerText: org.footerText ?? "",
    termsServiceOrder: org.termsServiceOrder ?? "",
    termsQuote: org.termsQuote ?? "",
    portalWelcome: org.portalWelcome ?? "",
    zipCode: branch?.zipCode ?? "",
    street: branch?.street ?? "",
    addressNumber: branch?.addressNumber ?? "",
    complement: branch?.complement ?? "",
    district: branch?.district ?? "",
    city: branch?.city ?? "",
    state: branch?.state ?? "",
  };
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.session?.accessToken ?? null);
  const applyBranding = useBrandingStore((s) => s.apply);
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const cepLookupRef = useRef("");
  const numberInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"dados" | "visual" | "termos" | "auditoria">("dados");
  const [editOpen, setEditOpen] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    tradeName: "",
    document: "",
    email: "",
    phone: "",
    logoUrl: "",
    primaryColor: "#0E7490",
    accentColor: "#0F3D4C",
    footerText: "",
    termsServiceOrder: "",
    termsQuote: "",
    portalWelcome: "",
    zipCode: "",
    street: "",
    addressNumber: "",
    complement: "",
    district: "",
    city: "",
    state: "",
  });

  const { data: org } = useQuery({
    queryKey: ["organization"],
    queryFn: () => api.organization(token!),
    enabled: !!token,
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => api.auditLogs(token!),
    enabled: !!token && tab === "auditoria",
  });

  useEffect(() => {
    if (org) setForm(orgToForm(org));
  }, [org]);

  const lookupCep = useCallback(async (rawCep: string) => {
    const digits = normalizeCep(rawCep);
    if (digits.length !== 8 || digits === cepLookupRef.current) return;

    cepLookupRef.current = digits;
    setCepLoading(true);
    setCepError(null);

    try {
      const address = await fetchAddressByCep(digits);
      if (!address) {
        setCepError("CEP não encontrado");
        cepLookupRef.current = "";
        return;
      }

      setForm((f) => ({
        ...f,
        zipCode: address.zipCode,
        street: address.street || f.street,
        district: address.district || f.district,
        city: address.city || f.city,
        state: address.state || f.state,
      }));
      numberInputRef.current?.focus();
    } catch {
      setCepError("Não foi possível consultar o CEP");
      cepLookupRef.current = "";
    } finally {
      setCepLoading(false);
    }
  }, []);

  const save = useMutation({
    mutationFn: () => api.updateOrganization(token!, form),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organization"] });
      setEditOpen(false);
    },
  });

  async function handleLogoUpload(file: File | null) {
    if (!file || !token) return;
    setLogoError("");
    setLogoUploading(true);
    try {
      const updated = await api.uploadOrganizationLogo(token, file);
      applyBranding({
        name: updated.name,
        tradeName: updated.tradeName,
        logoUrl: updated.logoUrl ?? null,
        primaryColor: updated.primaryColor,
        accentColor: updated.accentColor,
      });
      void queryClient.invalidateQueries({ queryKey: ["organization"] });
    } catch (err) {
      setLogoError(err instanceof ApiError ? String(err.message) : "Falha no upload do logo");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  const logoSrc = resolveAssetUrl(org?.logoUrl);
  const orgAddress = branchAddressLabel(mainBranch(org));

  return (
    <>
      <ModulePageShell
        title="Configuracoes"
        description="Dados da oficina, identidade visual, termos e auditoria"
        actionLabel="Editar"
        onAction={() => setEditOpen(true)}
      >
        <div className="flex gap-2 mb-4 border-b border-[#E2E8F0]">
          {(
            [
              ["dados", "Empresa"],
              ["visual", "Visual"],
              ["termos", "Termos"],
              ["auditoria", "Auditoria"],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t ? "border-[#0E7490] text-[#0E7490]" : "border-transparent text-[#64748B]"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate(routes.admin)}
            className="ml-auto text-sm text-[#64748B] hover:text-[#0E7490]"
          >
            Painel admin
          </button>
        </div>

        {tab === "dados" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-[#0F172A] to-[#0E7490] rounded-xl p-5 text-white lg:col-span-2">
              <p className="text-[12px] text-white/70 uppercase tracking-wide">Assinatura</p>
              <p className="text-lg font-semibold mt-1">
                Plano {subscription.planName} — {branding.appName}
              </p>
              <p className="text-[13px] text-white/80 mt-2">
                Valida ate <strong>{subscription.validUntil}</strong>
              </p>
            </div>
            <div className="bg-white rounded-xl card-shadow p-5">
              <h3 className="text-[14px] font-semibold text-[#1E293B] mb-4">Empresa</h3>
              <dl className="space-y-3 text-[13px]">
                <Row label="Razao social" value={org?.name} />
                <Row label="Nome fantasia" value={org?.tradeName} />
                <Row label="CNPJ" value={org?.document} />
                <Row label="E-mail" value={org?.email} />
                <Row label="Telefone" value={org?.phone} />
                <Row label="Endereco" value={orgAddress} />
                <Row label="Plano" value={org?.plan} highlight />
              </dl>
            </div>
            <div className="bg-white rounded-xl card-shadow p-5">
              <h3 className="text-[14px] font-semibold text-[#1E293B] mb-4">Filiais</h3>
              <ul className="divide-y divide-[#F1F5F9]">
                {(org?.branches ?? []).map((b) => (
                  <li key={b.id} className="py-3 flex justify-between text-[13px]">
                    <span className="font-medium">{b.name}</span>
                    {b.isMain && (
                      <span className="text-[10px] bg-[#ECFEFF] text-[#0E7490] px-2 py-0.5 rounded font-semibold">
                        Matriz
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === "visual" && (
          <div className="bg-white rounded-xl card-shadow p-5 max-w-lg">
            <h3 className="text-[14px] font-semibold mb-4">Identidade visual</h3>
            <input
              ref={logoInputRef}
              type="file"
              accept={LOGO_ACCEPT}
              className="hidden"
              onChange={(e) => void handleLogoUpload(e.target.files?.[0] ?? null)}
            />
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {logoSrc ? (
                <img src={logoSrc} alt="Logo" className="h-14 object-contain" />
              ) : (
                <p className="text-[13px] text-[#64748B]">Nenhum logo enviado.</p>
              )}
              <button
                type="button"
                disabled={logoUploading}
                onClick={() => logoInputRef.current?.click()}
                className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0E7490] font-medium hover:bg-[#F8FAFC] disabled:opacity-60"
              >
                {logoUploading ? "Enviando..." : "Trocar logo"}
              </button>
            </div>
            {logoError ? (
              <p className="text-sm text-[#DC2626] mb-3">{logoError}</p>
            ) : null}
            <p className="text-[11px] text-[#94A3B8] mb-4">
              PNG, JPEG, JPG ou WebP — até 5 MB. Atualiza ERP, portal e impressões.
            </p>
            <dl className="space-y-3 text-[13px]">
              <Row label="Cor primaria" value={org?.primaryColor} />
              <Row label="Cor destaque" value={org?.accentColor} />
              <Row label="Rodape" value={org?.footerText} />
            </dl>
            <div className="flex gap-2 mt-4">
              <span className="w-8 h-8 rounded" style={{ background: org?.primaryColor ?? "#0E7490" }} />
              <span className="w-8 h-8 rounded" style={{ background: org?.accentColor ?? "#0F3D4C" }} />
            </div>
          </div>
        )}

        {tab === "termos" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl card-shadow p-5">
              <h3 className="text-[14px] font-semibold mb-2">Termos da OS</h3>
              <p className="text-[13px] text-[#64748B] whitespace-pre-wrap">
                {org?.termsServiceOrder || "Nao configurado."}
              </p>
            </div>
            <div className="bg-white rounded-xl card-shadow p-5">
              <h3 className="text-[14px] font-semibold mb-2">Termos do orcamento</h3>
              <p className="text-[13px] text-[#64748B] whitespace-pre-wrap">
                {org?.termsQuote || "Nao configurado."}
              </p>
            </div>
            <div className="bg-white rounded-xl card-shadow p-5 lg:col-span-2">
              <h3 className="text-[14px] font-semibold mb-2">Mensagem do portal do cliente</h3>
              <p className="text-[13px] text-[#64748B]">{org?.portalWelcome || "Nao configurado."}</p>
            </div>
          </div>
        )}

        {tab === "auditoria" && (
          <div className="bg-white rounded-xl card-shadow overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="text-left px-4 py-2">Data</th>
                  <th className="text-left px-4 py-2">Usuario</th>
                  <th className="text-left px-4 py-2">Acao</th>
                  <th className="text-left px-4 py-2">Detalhe</th>
                  <th className="text-left px-4 py-2">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-[#64748B]">
                      Carregando...
                    </td>
                  </tr>
                ) : !auditLogs?.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-[#64748B]">
                      Nenhum registro de auditoria.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log: AuditLogRow) => (
                    <tr key={log.id} className="border-t border-[#E2E8F0]">
                      <td className="px-4 py-3 text-[#64748B]">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">{log.user?.name ?? "Sistema"}</td>
                      <td className="px-4 py-3 font-medium">
                        {AUDIT_LABELS[log.action] ?? log.action}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#64748B] max-w-xs">
                        {formatAuditDetail(log)}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#1E293B] max-w-sm whitespace-pre-wrap">
                        {log.reason ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </ModulePageShell>

      <FormDrawer
        open={editOpen}
        title="Editar configuracoes"
        onClose={() => setEditOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        loading={save.isPending}
      >
        <FormField label="Razao social *">
          <input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </FormField>
        <FormField label="Nome fantasia">
          <input className={inputClass} value={form.tradeName} onChange={(e) => setForm((f) => ({ ...f, tradeName: e.target.value }))} />
        </FormField>
        <FormField label="CNPJ">
          <input className={inputClass} value={form.document} onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))} />
        </FormField>
        <FormField label="E-mail">
          <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </FormField>
        <FormField label="Telefone">
          <input className={inputClass} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </FormField>

        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide pt-1">
          Endereco da oficina
        </p>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="CEP" className="col-span-1">
            <input
              className={inputClass}
              value={form.zipCode}
              placeholder="00000-000"
              maxLength={9}
              inputMode="numeric"
              onChange={(e) => {
                const formatted = formatCepInput(e.target.value);
                setForm((f) => ({ ...f, zipCode: formatted }));
                const digits = normalizeCep(formatted);
                if (digits.length !== 8) {
                  cepLookupRef.current = "";
                  setCepError(null);
                  return;
                }
                void lookupCep(formatted);
              }}
              onBlur={() => void lookupCep(form.zipCode)}
            />
            {cepLoading && (
              <p className="text-[11px] text-[#64748B] mt-1">Buscando endereco...</p>
            )}
            {cepError && !cepLoading && (
              <p className="text-[11px] text-[#DC2626] mt-1">{cepError}</p>
            )}
          </FormField>
          <FormField label="Cidade" className="col-span-2">
            <input
              className={inputClass}
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </FormField>
        </div>
        <FormField label="Rua / logradouro">
          <input
            className={inputClass}
            value={form.street}
            onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
          />
        </FormField>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Numero">
            <input
              ref={numberInputRef}
              className={inputClass}
              value={form.addressNumber}
              onChange={(e) => setForm((f) => ({ ...f, addressNumber: e.target.value }))}
              placeholder="Informe o numero"
            />
          </FormField>
          <FormField label="Bairro" className="col-span-2">
            <input
              className={inputClass}
              value={form.district}
              onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="UF">
            <input
              className={inputClass}
              value={form.state}
              maxLength={2}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))}
            />
          </FormField>
          <FormField label="Complemento" className="col-span-2">
            <input
              className={inputClass}
              value={form.complement}
              onChange={(e) => setForm((f) => ({ ...f, complement: e.target.value }))}
            />
          </FormField>
        </div>

        <FormField label="URL do logo">
          <input className={inputClass} value={form.logoUrl} onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Cor primaria">
            <input type="color" className="h-10 w-full" value={form.primaryColor} onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))} />
          </FormField>
          <FormField label="Cor destaque">
            <input type="color" className="h-10 w-full" value={form.accentColor} onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))} />
          </FormField>
        </div>
        <FormField label="Texto do rodape">
          <input className={inputClass} value={form.footerText} onChange={(e) => setForm((f) => ({ ...f, footerText: e.target.value }))} />
        </FormField>
        <FormField label="Termos da OS">
          <textarea className={inputClass} rows={3} value={form.termsServiceOrder} onChange={(e) => setForm((f) => ({ ...f, termsServiceOrder: e.target.value }))} />
        </FormField>
        <FormField label="Termos do orcamento">
          <textarea className={inputClass} rows={3} value={form.termsQuote} onChange={(e) => setForm((f) => ({ ...f, termsQuote: e.target.value }))} />
        </FormField>
        <FormField label="Boas-vindas portal">
          <textarea className={inputClass} rows={2} value={form.portalWelcome} onChange={(e) => setForm((f) => ({ ...f, portalWelcome: e.target.value }))} />
        </FormField>
      </FormDrawer>
    </>
  );
}

function Row({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[#64748B]">{label}</dt>
      <dd className={highlight ? "font-medium text-[#0E7490] capitalize" : "text-[#1E293B] text-right"}>
        {value || "—"}
      </dd>
    </div>
  );
}
