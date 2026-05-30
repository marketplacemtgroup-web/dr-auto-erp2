import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass } from "../../components/modules/FormDrawer";
import { branding, subscription } from "../../lib/branding";
import { api, type OrganizationDetail } from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import { routes } from "../../lib/routes";

const AUDIT_LABELS: Record<string, string> = {
  login: "Login",
  "settings.update": "Configuracoes alteradas",
  "customer.update": "Cliente atualizado",
  "customer.delete": "Cliente excluido",
  "service_order.status_change": "Status da OS",
  "service_order.amount_change": "Valor da OS",
  "service_order.delete": "OS excluida",
  "financial.pay": "Pagamento baixado",
};

function orgToForm(org: OrganizationDetail) {
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
  };
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.session?.accessToken ?? null);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"dados" | "visual" | "termos" | "auditoria">("dados");
  const [editOpen, setEditOpen] = useState(false);
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

  const save = useMutation({
    mutationFn: () => api.updateOrganization(token!, form),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organization"] });
      setEditOpen(false);
    },
  });

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
              ["dados", "Oficina"],
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
              <h3 className="text-[14px] font-semibold text-[#1E293B] mb-4">Oficina</h3>
              <dl className="space-y-3 text-[13px]">
                <Row label="Razao social" value={org?.name} />
                <Row label="Nome fantasia" value={org?.tradeName} />
                <Row label="CNPJ" value={org?.document} />
                <Row label="E-mail" value={org?.email} />
                <Row label="Telefone" value={org?.phone} />
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
            <dl className="space-y-3 text-[13px]">
              <Row label="Logo (URL)" value={org?.logoUrl} />
              <Row label="Cor primaria" value={org?.primaryColor} />
              <Row label="Cor destaque" value={org?.accentColor} />
              <Row label="Rodape" value={org?.footerText} />
            </dl>
            {org?.logoUrl ? (
              <img src={org.logoUrl} alt="Logo" className="mt-4 h-12 object-contain" />
            ) : null}
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
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-[#64748B]">
                      Carregando...
                    </td>
                  </tr>
                ) : !auditLogs?.length ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-[#64748B]">
                      Nenhum registro de auditoria.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="border-t border-[#E2E8F0]">
                      <td className="px-4 py-3 text-[#64748B]">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">{log.user?.name ?? "Sistema"}</td>
                      <td className="px-4 py-3 font-medium">
                        {AUDIT_LABELS[log.action] ?? log.action}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#64748B] max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : log.resource ?? "—"}
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
