import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle } from "lucide-react";
import FormDrawer, { FormField, inputClass } from "../../components/modules/FormDrawer";
import ConfirmDialog from "../../components/modules/ConfirmDialog";
import KpiStrip from "../../components/modules/KpiStrip";
import { api, type SupplierProfile } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { routes } from "../../lib/routes";
import { whatsappUrl } from "../../lib/whatsapp";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  AWAITING_RECEIPT: "Aguardando recebimento",
  PARTIALLY_RECEIVED: "Recebido parcial",
  RECEIVED: "Recebido",
  CANCELLED: "Cancelado",
  ORDERED: "Pedido",
  ORDER_SENT: "Enviado",
};

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"dados" | "historico">("dados");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({
    legalName: "",
    tradeName: "",
    phone: "",
    whatsapp: "",
    email: "",
    notes: "",
  });

  const { data: profile, isLoading } = useApiQuery<SupplierProfile>(
    ["supplier-profile", id ?? ""],
    (t) => api.supplierProfile(t, id!),
    Boolean(id),
  );

  const save = useMutation({
    mutationFn: () => api.updateSupplier(token!, id!, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-profile", id] });
      setEditOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: () => api.deleteSupplier(token!, id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      navigate(routes.fornecedores);
    },
  });

  if (isLoading || !profile) {
    return <div className="p-6 text-[#64748B]">Carregando fornecedor...</div>;
  }

  const { supplier, stats, recentPurchases } = profile;
  const displayName = supplier.tradeName || supplier.legalName;
  const contactPhone = supplier.whatsapp ?? supplier.phone;

  function openEdit() {
    setForm({
      legalName: supplier.legalName,
      tradeName: supplier.tradeName ?? "",
      phone: supplier.phone ?? "",
      whatsapp: supplier.whatsapp ?? "",
      email: supplier.email ?? "",
      notes: supplier.notes ?? "",
    });
    setEditOpen(true);
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate(routes.fornecedores)}
        className="inline-flex items-center gap-2 text-[13px] text-[#64748B] hover:text-[#0E7490]"
      >
        <ArrowLeft size={16} />
        Voltar para fornecedores
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F3D4C]">{displayName}</h1>
          <p className="text-[13px] text-[#64748B] mt-1">
            {supplier.document ?? "Sem documento"} · {supplier.city ?? "—"}
            {supplier.state ? `/${supplier.state}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {contactPhone ? (
            <a
              href={whatsappUrl(contactPhone, `Olá, ${displayName}!`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#25D366] text-white text-[13px] font-medium hover:bg-[#1da851]"
            >
              <MessageCircle size={16} />
              Falar no WhatsApp
            </a>
          ) : null}
          <button
            type="button"
            onClick={openEdit}
            className="h-9 px-4 rounded-lg border border-[#0E7490] text-[13px] text-[#0E7490] font-medium hover:bg-[#ECFEFF]"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="h-9 px-4 rounded-lg border border-red-200 text-[13px] text-red-600 font-medium hover:bg-red-50"
          >
            Excluir
          </button>
        </div>
      </div>

      <KpiStrip
        items={[
          { label: "Compras", value: String(stats.purchaseCount) },
          { label: "Volume total", value: formatMoney(stats.totalPurchased) },
          {
            label: "AP em aberto",
            value: formatMoney(stats.openPayablesAmount),
            tone: stats.openPayablesAmount > 0 ? "warning" : "default",
          },
        ]}
      />

      <div className="flex gap-2 border-b border-[#E2E8F0]">
        {(["dados", "historico"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px ${
              tab === t
                ? "border-[#0E7490] text-[#0E7490]"
                : "border-transparent text-[#64748B]"
            }`}
          >
            {t === "dados" ? "Dados" : "Histórico"}
          </button>
        ))}
      </div>

      {tab === "dados" ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 grid md:grid-cols-2 gap-4 text-[13px]">
          <div>
            <p className="text-[#94A3B8] text-[11px] uppercase">Razão social</p>
            <p className="font-medium">{supplier.legalName}</p>
          </div>
          <div>
            <p className="text-[#94A3B8] text-[11px] uppercase">Contato</p>
            <p>{supplier.contactName ?? "—"}</p>
          </div>
          <div>
            <p className="text-[#94A3B8] text-[11px] uppercase">Telefone</p>
            <p>{supplier.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-[#94A3B8] text-[11px] uppercase">WhatsApp</p>
            {supplier.whatsapp ? (
              <a
                href={whatsappUrl(supplier.whatsapp, `Olá, ${displayName}!`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#25D366] font-medium hover:text-[#1da851]"
              >
                <MessageCircle size={14} />
                {supplier.whatsapp}
              </a>
            ) : (
              <p>—</p>
            )}
          </div>
          <div>
            <p className="text-[#94A3B8] text-[11px] uppercase">E-mail</p>
            <p>{supplier.email ?? "—"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-[#94A3B8] text-[11px] uppercase">Observações</p>
            <p className="whitespace-pre-wrap">{supplier.notes ?? "—"}</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[#F8FAFC] text-[#475569]">
              <tr>
                <th className="text-left px-4 py-3">Número</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentPurchases.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-[#94A3B8]">
                    Nenhuma compra registrada.
                  </td>
                </tr>
              ) : (
                recentPurchases.map((p) => (
                  <tr key={p.id} className="border-t border-[#F1F5F9]">
                    <td className="px-4 py-3">
                      <Link to={routes.compras} className="text-[#0E7490] font-medium">
                        {p.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{STATUS_LABEL[p.status] ?? p.status}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(Number(p.totalAmount))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <FormDrawer
        open={editOpen}
        title="Editar fornecedor"
        onClose={() => setEditOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        loading={save.isPending}
      >
        <FormField label="Razão social">
          <input
            className={inputClass}
            value={form.legalName}
            onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
          />
        </FormField>
        <FormField label="Nome fantasia">
          <input
            className={inputClass}
            value={form.tradeName}
            onChange={(e) => setForm((f) => ({ ...f, tradeName: e.target.value }))}
          />
        </FormField>
        <FormField label="Telefone">
          <input
            className={inputClass}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </FormField>
        <FormField label="WhatsApp">
          <input
            className={inputClass}
            value={form.whatsapp}
            onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
            placeholder="Usado no botão de contato"
          />
        </FormField>
        <FormField label="E-mail">
          <input
            className={inputClass}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </FormField>
        <FormField label="Observações">
          <textarea
            className={`${inputClass} min-h-[80px]`}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </FormField>
      </FormDrawer>

      <ConfirmDialog
        open={deleteOpen}
        title="Excluir fornecedor"
        message={`Excluir ${displayName}? O fornecedor será inativado e sairá da lista de ativos.`}
        loading={remove.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
