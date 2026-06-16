import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import CustomerFormFields, {
  customerFormPayload,
  emptyCustomerForm,
  type CustomerFormState,
} from "../../components/customers/CustomerFormFields";
import StatusBadge from "../../components/StatusBadge";
import KpiStrip from "../../components/modules/KpiStrip";
import FormDrawer, { FormField, inputClass } from "../../components/modules/FormDrawer";
import { api } from "../../lib/api";
import { formatDateTime, formatMoney } from "../../lib/format";
import { osStatusLabel, osStatusToVariant, quoteStatusLabel } from "../../lib/service-order-status";
import { routes } from "../../lib/routes";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<
    "visao" | "veiculos" | "os" | "orcamentos" | "contatos" | "timeline"
  >("visao");
  const [editDrawer, setEditDrawer] = useState(false);
  const [editForm, setEditForm] = useState<CustomerFormState>(emptyCustomerForm());
  const [contactDrawer, setContactDrawer] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    role: "",
    phone: "",
    email: "",
  });

  const { data: c, isLoading, error } = useApiQuery(
    ["customer", id ?? ""],
    (t) => api.customer(t, id!),
    !!id,
  );

  const saveCadastro = useMutation({
    mutationFn: () => api.updateCustomer(token!, id!, customerFormPayload(editForm)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setEditDrawer(false);
    },
  });

  const saveContact = useMutation({
    mutationFn: () =>
      api.createCustomerContact(token!, id!, {
        name: contactForm.name,
        role: contactForm.role || undefined,
        phone: contactForm.phone || undefined,
        email: contactForm.email || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      setContactDrawer(false);
      setContactForm({ name: "", role: "", phone: "", email: "" });
    },
  });

  if (isLoading && !c) {
    return <main className="px-6 pb-8 text-sm text-[#64748B]">Carregando cliente...</main>;
  }

  if (error || !c) {
    return (
      <main className="px-6 pb-8">
        <p className="text-red-600 text-sm">Cliente não encontrado.</p>
        <Link to={routes.clientes} className="text-[#0E7490] text-sm mt-2 inline-block">
          Voltar
        </Link>
      </main>
    );
  }

  const address = [c.street, c.addressNumber, c.district, c.city, c.state]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="px-6 pb-8">
      <Link
        to={routes.clientes}
        className="inline-flex items-center gap-1 text-sm text-[#64748B] hover:text-[#0E7490] mb-4"
      >
        <ArrowLeft size={16} />
        Clientes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[22px] font-semibold text-[#1E293B]">{c.name}</h1>
            {c.isVip && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                VIP
              </span>
            )}
            {c.isBlocked && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700">
                Bloqueado
              </span>
            )}
          </div>
          <p className="text-sm text-[#64748B] mt-1">
            {c.customerType === "PJ" ? "Pessoa jurídica" : "Pessoa física"}
            {c.document ? ` · ${c.document}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditForm({
              name: c.name,
              customerType: c.customerType ?? "PF",
              document: c.document ?? "",
              phone: c.phone ?? "",
              whatsapp: c.whatsapp ?? "",
              email: c.email ?? "",
              street: c.street ?? "",
              addressNumber: c.addressNumber ?? "",
              complement: c.complement ?? "",
              district: c.district ?? "",
              city: c.city ?? "",
              state: c.state ?? "",
              zipCode: c.zipCode ?? "",
              origin: c.origin ?? "",
              isVip: c.isVip ?? false,
              isBlocked: c.isBlocked ?? false,
              isDelinquent: c.isDelinquent ?? false,
              notes: c.notes ?? "",
            });
            setEditDrawer(true);
          }}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] hover:bg-[#F8FAFC]"
        >
          <Pencil size={16} />
          Editar cadastro
        </button>
      </div>

      <KpiStrip
        items={[
          { label: "Total gasto", value: formatMoney(c.kpis.totalSpent), tone: "success" },
          { label: "Ticket médio", value: formatMoney(c.kpis.averageTicket) },
          { label: "Ordens de serviço", value: String(c.kpis.orderCount) },
          { label: "OS em aberto", value: String(c.kpis.openOrders), tone: c.kpis.openOrders > 0 ? "warning" : "default" },
          {
            label: "Última visita",
            value: c.kpis.lastVisit ? formatDateTime(c.kpis.lastVisit).split(" ")[0] : "—",
          },
        ]}
      />

      <div className="flex flex-wrap gap-2 mt-6 mb-5 border-b border-[#E2E8F0]">
        {(
          [
            ["visao", "Visão geral"],
            ["veiculos", `Veículos (${c.vehicles.length})`],
            ["os", `OS (${c.serviceOrders.length})`],
            ["orcamentos", `Orçamentos (${c.quotes.length})`],
            ["contatos", `Contatos (${c.contacts?.length ?? 0})`],
            ["timeline", "Timeline"],
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
      </div>

      {tab === "visao" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-3 text-sm">
            <h3 className="font-semibold text-[#1E293B]">Contato</h3>
            <p>
              <span className="text-[#64748B]">Telefone:</span> {c.phone ?? "—"}
            </p>
            <p>
              <span className="text-[#64748B]">WhatsApp:</span> {c.whatsapp ?? "—"}
            </p>
            <p>
              <span className="text-[#64748B]">E-mail:</span> {c.email ?? "—"}
            </p>
            {c.origin && (
              <p>
                <span className="text-[#64748B]">Origem:</span> {c.origin}
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 text-sm">
            <h3 className="font-semibold text-[#1E293B] mb-3">Endereço</h3>
            <p className="text-[#64748B]">{address || "Não informado"}</p>
            {c.zipCode && <p className="text-[#64748B] mt-1">CEP {c.zipCode}</p>}
            {c.notes && (
              <>
                <h3 className="font-semibold text-[#1E293B] mt-4 mb-2">Observações</h3>
                <p className="text-[#64748B] whitespace-pre-wrap">{c.notes}</p>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "veiculos" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b border-[#F1F5F9]">
            <h3 className="text-sm font-semibold text-[#1E293B]">Veículos do cliente</h3>
            <button
              type="button"
              onClick={() =>
                navigate(`${routes.veiculos}?customerId=${encodeURIComponent(id!)}`)
              }
              className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-[#0F3D4C] text-white text-sm"
            >
              <Plus size={16} />
              Cadastrar veículo
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] text-xs text-[#64748B] uppercase">
                <th className="px-4 py-2 text-left">Placa</th>
                <th className="px-4 py-2 text-left">Veículo</th>
                <th className="px-4 py-2 text-left">Cor</th>
              </tr>
            </thead>
            <tbody>
              {c.vehicles.map((v) => (
                <tr
                  key={v.id}
                  className="border-t border-[#F1F5F9] hover:bg-[#F8FAFC] cursor-pointer"
                  onClick={() => navigate(routes.veiculoDetalhe(v.id))}
                >
                  <td className="px-4 py-3 font-semibold">{v.plate}</td>
                  <td className="px-4 py-3">
                    {[v.brand, v.model, v.year].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-[#64748B]">{v.color ?? "—"}</td>
                </tr>
              ))}
              {c.vehicles.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[#94A3B8]">
                    Nenhum veículo cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "os" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] text-xs text-[#64748B] uppercase">
                <th className="px-4 py-2 text-left">OS</th>
                <th className="px-4 py-2 text-left">Placa</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {c.serviceOrders.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-[#F1F5F9] hover:bg-[#F8FAFC] cursor-pointer"
                  onClick={() => navigate(routes.ordemDeServicoDetalhe(o.id))}
                >
                  <td className="px-4 py-3 font-medium">#{o.number}</td>
                  <td className="px-4 py-3">{o.vehicle.plate}</td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={osStatusToVariant(o.status)} />
                    <span className="ml-2 text-xs text-[#64748B]">{osStatusLabel(o.status)}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatMoney(o.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "orcamentos" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] text-xs text-[#64748B] uppercase">
                <th className="px-4 py-2 text-left">OS</th>
                <th className="px-4 py-2 text-left">Placa</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {c.quotes.map((q) => (
                <tr key={q.id} className="border-t border-[#F1F5F9]">
                  <td className="px-4 py-3">#{q.serviceOrder.number}</td>
                  <td className="px-4 py-3">{q.serviceOrder.vehicle.plate}</td>
                  <td className="px-4 py-3">{quoteStatusLabel(q.status)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatMoney(q.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "contatos" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <div className="flex justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#1E293B]">Contatos adicionais</h3>
            <button
              type="button"
              onClick={() => setContactDrawer(true)}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-[#0F3D4C] text-white text-sm"
            >
              <Plus size={16} />
              Novo contato
            </button>
          </div>
          <ul className="divide-y divide-[#F1F5F9]">
            {(c.contacts ?? []).map((ct) => (
              <li key={ct.id} className="py-3 flex justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium text-[#1E293B]">
                    {ct.name}
                    {ct.isPrimary && (
                      <span className="ml-2 text-xs text-[#0E7490]">principal</span>
                    )}
                  </p>
                  <p className="text-[#64748B] text-xs">
                    {[ct.role, ct.phone, ct.email].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
              </li>
            ))}
            {(c.contacts ?? []).length === 0 && (
              <li className="text-sm text-[#94A3B8] py-4">Nenhum contato extra.</li>
            )}
          </ul>
        </div>
      )}

      {tab === "timeline" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
          <ul className="space-y-4">
            {c.timeline.map((h) => (
              <li key={h.id} className="text-sm border-l-2 border-[#0E7490] pl-3">
                <p className="font-medium text-[#1E293B]">
                  OS #{h.serviceOrder.number} · {h.serviceOrder.vehicle.plate}
                </p>
                <p className="text-[#64748B]">
                  {h.fromStatus ? `${osStatusLabel(h.fromStatus)} → ` : ""}
                  {osStatusLabel(h.toStatus)}
                </p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  {formatDateTime(h.createdAt)}
                  {h.user?.name ? ` · ${h.user.name}` : ""}
                </p>
              </li>
            ))}
            {c.timeline.length === 0 && (
              <li className="text-sm text-[#94A3B8]">Sem movimentações registradas.</li>
            )}
          </ul>
        </div>
      )}

      <FormDrawer
        open={editDrawer}
        title="Editar cadastro"
        subtitle="Dados de identificação, contato e endereço"
        onClose={() => setEditDrawer(false)}
        onSubmit={(e) => {
          e.preventDefault();
          saveCadastro.mutate();
        }}
        loading={saveCadastro.isPending}
        submitLabel="Salvar cadastro"
      >
        <CustomerFormFields form={editForm} setForm={setEditForm} />
      </FormDrawer>

      <FormDrawer
        open={contactDrawer}
        title="Novo contato"
        onClose={() => setContactDrawer(false)}
        onSubmit={(e) => {
          e.preventDefault();
          saveContact.mutate();
        }}
        loading={saveContact.isPending}
        submitLabel="Salvar"
      >
        <FormField label="Nome *">
          <input
            className={inputClass}
            value={contactForm.name}
            onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </FormField>
        <FormField label="Função">
          <input
            className={inputClass}
            value={contactForm.role}
            onChange={(e) => setContactForm((f) => ({ ...f, role: e.target.value }))}
          />
        </FormField>
        <FormField label="Telefone">
          <input
            className={inputClass}
            value={contactForm.phone}
            onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </FormField>
        <FormField label="E-mail">
          <input
            type="email"
            className={inputClass}
            value={contactForm.email}
            onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
          />
        </FormField>
      </FormDrawer>
    </main>
  );
}
