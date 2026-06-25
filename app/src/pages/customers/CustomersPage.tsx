import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer from "../../components/modules/FormDrawer";
import CustomerFormFields, {
  customerFormPayload,
  emptyCustomerForm,
  type CustomerFormState,
} from "../../components/customers/CustomerFormFields";
import KpiStrip from "../../components/modules/KpiStrip";
import DataTable from "../../components/modules/DataTable";
import ConfirmDialog from "../../components/modules/ConfirmDialog";
import ListPagination from "../../components/modules/ListPagination";
import { api, LIST_PAGE_SIZE, type CustomerDetail, type CustomerRow } from "../../lib/api";
import { routes } from "../../lib/routes";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";

function formFromDetail(c: CustomerDetail): CustomerFormState {
  return {
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
  };
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState<CustomerFormState>(emptyCustomerForm());
  const [loadingEdit, setLoadingEdit] = useState(false);

  const { data, isLoading, error } = useApiQuery(
    ["customers", search, String(page)],
    (t) => api.customers(t, search || undefined, page, LIST_PAGE_SIZE),
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  const rows = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 0;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyCustomerForm());
    setDrawerOpen(true);
  };

  const openEdit = async (row: CustomerRow) => {
    if (!token) return;
    setLoadingEdit(true);
    try {
      const full = await api.customer(token, row.id);
      setEditingId(row.id);
      setForm(formFromDetail(full));
      setDrawerOpen(true);
    } finally {
      setLoadingEdit(false);
    }
  };

  const save = useMutation({
    mutationFn: () =>
      editingId
        ? api.updateCustomer(token!, editingId, customerFormPayload(form))
        : api.createCustomer(token!, customerFormPayload(form)),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setDrawerOpen(false);
      setEditingId(null);
      setForm(emptyCustomerForm());
      navigate(routes.clienteDetalhe(saved.id));
    },
  });

  const remove = useMutation({
    mutationFn: () => api.deleteCustomer(token!, deleteTarget!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setDeleteTarget(null);
    },
  });

  const withVehicles = rows.filter((c) => c._count.vehicles > 0).length;

  return (
    <>
      <ModulePageShell
        title="Clientes"
        description="Cadastro completo e ficha do cliente (clique na linha para ver histórico)"
        actionLabel="Novo cliente"
        onAction={openCreate}
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
        }}
      >
        <KpiStrip
          items={[
            { label: "Total clientes", value: String(total) },
            { label: "Com veiculo", value: String(withVehicles), tone: "success" },
            {
              label: "Sem veiculo",
              value: String(rows.length - withVehicles),
              tone: rows.length - withVehicles > 0 ? "warning" : "default",
            },
          ]}
        />
        <DataTable
          columns={[
            { key: "name", header: "Nome", render: (c) => c.name },
            { key: "doc", header: "CPF/CNPJ", render: (c) => c.document ?? "—" },
            { key: "phone", header: "Telefone", render: (c) => c.phone ?? "—" },
            { key: "wa", header: "WhatsApp", render: (c) => c.whatsapp ?? "—" },
            { key: "email", header: "E-mail", render: (c) => c.email ?? "—" },
            {
              key: "veh",
              header: "Veiculos",
              className: "text-right",
              render: (c) => (
                <span className="font-semibold">{c._count.vehicles}</span>
              ),
            },
          ]}
          rows={rows}
          loading={isLoading}
          error={error}
          emptyMessage="Nenhum cliente. Clique em Novo cliente."
          onRowClick={(row) => navigate(routes.clienteDetalhe(row.id))}
          onEdit={(row) => void openEdit(row)}
          onDelete={setDeleteTarget}
        />
        <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        size="xl"
        title={editingId ? "Editar cadastro do cliente" : "Novo cliente"}
        subtitle="Preencha a ficha completa. Após salvar você verá veículos, OS e histórico."
        onClose={() => setDrawerOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        loading={save.isPending || loadingEdit}
        submitLabel={editingId ? "Salvar e abrir ficha" : "Cadastrar e abrir ficha"}
      >
        <CustomerFormFields form={form} setForm={setForm} />
        {save.isError && (
          <p className="text-sm text-[#DC2626]">Não foi possível salvar.</p>
        )}
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir cliente"
        message={`Excluir ${deleteTarget?.name}? Só é possível se não houver veículos vinculados.`}
        loading={remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}
