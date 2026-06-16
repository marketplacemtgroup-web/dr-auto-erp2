import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass } from "../../components/modules/FormDrawer";
import KpiStrip from "../../components/modules/KpiStrip";
import DataTable from "../../components/modules/DataTable";
import { api, type SupplierRow } from "../../lib/api";
import { routes } from "../../lib/routes";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";

const SUPPLIER_TYPES: Record<string, string> = {
  AUTOPECAS: "Autopeças",
  MOTOPECAS: "Motopeças",
  FERRAMENTAS: "Ferramentas",
  LUBRIFICANTES: "Lubrificantes",
  PNEUS: "Pneus",
  ELETRICA: "Elétrica",
  FUNILARIA: "Funilaria",
  TERCEIRIZADO: "Terceirizado",
  OUTROS: "Outros",
};

const emptyForm = {
  personType: "PJ",
  legalName: "",
  tradeName: "",
  document: "",
  supplierType: "OUTROS",
  contactName: "",
  phone: "",
  whatsapp: "",
  email: "",
  city: "",
  state: "",
  notes: "",
};

export default function SuppliersPage() {
  const navigate = useNavigate();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading, error } = useApiQuery(
    ["suppliers", search],
    (t) => api.suppliers(t, search || undefined, "ACTIVE"),
  );

  const save = useMutation({
    mutationFn: () =>
      api.createSupplier(token!, {
        personType: form.personType,
        legalName: form.legalName,
        tradeName: form.tradeName || undefined,
        document: form.document || undefined,
        supplierType: form.supplierType,
        contactName: form.contactName || undefined,
        phone: form.phone || undefined,
        whatsapp: form.whatsapp || undefined,
        email: form.email || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setDrawerOpen(false);
      setForm(emptyForm);
      navigate(routes.fornecedorDetalhe(saved.id));
    },
  });

  const active = data?.length ?? 0;

  return (
    <>
      <ModulePageShell
        title="Fornecedores"
        description="Cadastro de fornecedores e histórico de compras"
        actionLabel="Novo fornecedor"
        onAction={() => setDrawerOpen(true)}
        onSearch={setSearch}
      >
        <KpiStrip
          items={[
            { label: "Ativos", value: String(active) },
            { label: "Tipos", value: String(new Set(data?.map((s) => s.supplierType)).size) },
          ]}
        />
        <DataTable
          loading={isLoading}
          error={error ?? null}
          emptyMessage="Nenhum fornecedor cadastrado."
          columns={[
            { key: "name", header: "Nome", render: (r: SupplierRow) => r.tradeName || r.legalName },
            { key: "document", header: "Documento", render: (r) => r.document ?? "—" },
            {
              key: "type",
              header: "Tipo",
              render: (r) => SUPPLIER_TYPES[r.supplierType] ?? r.supplierType,
            },
            { key: "city", header: "Cidade", render: (r) => r.city ?? "—" },
            { key: "phone", header: "Telefone", render: (r) => r.phone ?? r.email ?? "—" },
          ]}
          rows={data ?? []}
          onRowClick={(r) => navigate(routes.fornecedorDetalhe(r.id))}
        />
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        title="Novo fornecedor"
        onClose={() => setDrawerOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        loading={save.isPending}
      >
        <FormField label="Tipo pessoa">
          <select
            className={inputClass}
            value={form.personType}
            onChange={(e) => setForm((f) => ({ ...f, personType: e.target.value }))}
          >
            <option value="PJ">Pessoa jurídica</option>
            <option value="PF">Pessoa física</option>
          </select>
        </FormField>
        <FormField label="Razão social / Nome *">
          <input
            className={inputClass}
            value={form.legalName}
            onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
            required
          />
        </FormField>
        <FormField label="Nome fantasia">
          <input
            className={inputClass}
            value={form.tradeName}
            onChange={(e) => setForm((f) => ({ ...f, tradeName: e.target.value }))}
          />
        </FormField>
        <FormField label="CNPJ / CPF">
          <input
            className={inputClass}
            value={form.document}
            onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))}
          />
        </FormField>
        <FormField label="Categoria">
          <select
            className={inputClass}
            value={form.supplierType}
            onChange={(e) => setForm((f) => ({ ...f, supplierType: e.target.value }))}
          >
            {Object.entries(SUPPLIER_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Contato">
          <input
            className={inputClass}
            value={form.contactName}
            onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
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
            />
          </FormField>
        </div>
        <FormField label="E-mail">
          <input
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Cidade">
            <input
              className={inputClass}
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </FormField>
          <FormField label="UF">
            <input
              className={inputClass}
              maxLength={2}
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))}
            />
          </FormField>
        </div>
        <FormField label="Observações">
          <textarea
            className={`${inputClass} min-h-[80px]`}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </FormField>
      </FormDrawer>
    </>
  );
}
