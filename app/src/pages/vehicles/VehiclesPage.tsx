import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import DataTable from "../../components/modules/DataTable";
import ConfirmDialog from "../../components/modules/ConfirmDialog";
import ListPagination from "../../components/modules/ListPagination";
import { api, LIST_PAGE_SIZE, getErrorMessage, type VehicleRow } from "../../lib/api";
import { routes } from "../../lib/routes";
import {
  normalizePlate,
  parseOptionalKm,
  parseOptionalYear,
  validateVehicleForm,
} from "../../lib/vehicle-form";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";

const emptyForm = {
  customerId: "",
  plate: "",
  brand: "",
  model: "",
  year: "",
  color: "",
  vehicleKind: "CAR" as "CAR" | "MOTORCYCLE" | "TRUCK" | "OTHER",
  chassis: "",
  renavam: "",
  fuelType: "",
  currentKm: "",
  notes: "",
};

export default function VehiclesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const openedFromCustomer = useRef(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [customerSearch, setCustomerSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VehicleRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    data: customersRes,
    isLoading: customersLoading,
    error: customersError,
  } = useApiQuery(
    ["customers-picker", customerSearch],
    (t) => api.customers(t, customerSearch || undefined, 1, LIST_PAGE_SIZE),
    drawerOpen,
  );
  const customers = customersRes?.data ?? [];

  const { data, isLoading, error } = useApiQuery(
    ["vehicles", search, String(page)],
    (t) => api.vehicles(t, search || undefined, page, LIST_PAGE_SIZE),
  );

  const rows = data?.data ?? [];
  const totalPages = data?.pagination.totalPages ?? 0;

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const customerId = searchParams.get("customerId");
    if (!customerId || openedFromCustomer.current) return;
    openedFromCustomer.current = true;
    setEditing(null);
    setForm({ ...emptyForm, customerId });
    setSaveError(null);
    setDrawerOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const vehiclePayload = () => {
    const base = {
      plate: normalizePlate(form.plate),
      brand: form.brand || undefined,
      model: form.model || undefined,
      year: parseOptionalYear(form.year),
      color: form.color || undefined,
      vehicleKind: form.vehicleKind,
      chassis: form.chassis || undefined,
      renavam: form.renavam || undefined,
      fuelType: form.fuelType || undefined,
      currentKm: parseOptionalKm(form.currentKm),
      notes: form.notes || undefined,
    };
    if (editing) return base;
    return { ...base, customerId: form.customerId };
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSaveError(null);
    setDrawerOpen(true);
  };

  const openEdit = async (v: VehicleRow) => {
    if (!token) return;
    const full = await api.vehicle(token, v.id);
    setEditing(v);
    setForm({
      customerId: full.customer.id,
      plate: full.plate,
      brand: full.brand ?? "",
      model: full.model ?? "",
      year: full.year ? String(full.year) : "",
      color: full.color ?? "",
      vehicleKind: (full.vehicleKind as typeof form.vehicleKind) ?? "CAR",
      chassis: full.chassis ?? "",
      renavam: full.renavam ?? "",
      fuelType: full.fuelType ?? "",
      currentKm: full.currentKm ? String(full.currentKm) : "",
      notes: full.notes ?? "",
    });
    setSaveError(null);
    setDrawerOpen(true);
  };

  const save = useMutation({
    mutationFn: () =>
      editing
        ? api.updateVehicle(token!, editing.id, vehiclePayload())
        : api.createVehicle(token!, vehiclePayload()),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["customer"] });
      setDrawerOpen(false);
      setEditing(null);
      setSaveError(null);
      navigate(routes.veiculoDetalhe(saved.id));
    },
    onError: (err) => setSaveError(getErrorMessage(err)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateVehicleForm(form);
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    if (!editing && customersError) {
      setSaveError("Não foi possível carregar a lista de clientes. Atualize a página.");
      return;
    }
    setSaveError(null);
    save.mutate();
  };

  const remove = useMutation({
    mutationFn: () => api.deleteVehicle(token!, deleteTarget!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setDeleteTarget(null);
    },
  });

  return (
    <>
      <ModulePageShell
        title="Veiculos"
        description="Cadastro completo e prontuario do veiculo"
        actionLabel="Novo veiculo"
        onAction={openCreate}
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
        }}
      >
        <DataTable
          columns={[
            {
              key: "plate",
              header: "Placa",
              render: (v) => <span className="font-bold text-[#0E7490]">{v.plate}</span>,
            },
            { key: "customer", header: "Cliente", render: (v) => v.customer.name },
            {
              key: "model",
              header: "Marca / Modelo",
              render: (v) => [v.brand, v.model].filter(Boolean).join(" ") || "—",
            },
            { key: "year", header: "Ano", render: (v) => v.year ?? "—" },
            { key: "color", header: "Cor", render: (v) => v.color ?? "—" },
          ]}
          rows={rows}
          loading={isLoading}
          error={error}
          emptyMessage="Nenhum veiculo cadastrado."
          onRowClick={(row) => navigate(routes.veiculoDetalhe(row.id))}
          onEdit={(row) => void openEdit(row)}
          onDelete={setDeleteTarget}
        />
        <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        size="lg"
        title={editing ? "Editar veiculo" : "Novo veiculo"}
        subtitle="Dados do veiculo e vinculo ao cliente"
        error={saveError}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        loading={save.isPending}
        submitLabel={editing ? "Salvar e abrir ficha" : "Cadastrar e abrir ficha"}
      >
        <FormField label="Cliente *">
          {editing ? (
            <>
              <input
                className={inputClass}
                value={
                  customers.find((c) => c.id === form.customerId)?.name ||
                  editing.customer.name
                }
                readOnly
                disabled
              />
              <p className="text-xs text-[#64748B] mt-1">
                Para trocar o titular, use Transferir titularidade na ficha do veículo.
              </p>
            </>
          ) : (
            <>
              <input
                className={inputClass}
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Buscar cliente por nome..."
                disabled={!drawerOpen}
              />
              <select
                className={`${selectClass} mt-2`}
                value={form.customerId}
                onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                required
                disabled={customersLoading || !!customersError}
              >
                <option value="">
                  {customersLoading
                    ? "Carregando clientes..."
                    : customersError
                      ? "Erro ao carregar clientes"
                      : "Selecione..."}
                </option>
                {customers?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {customersError && (
                <p className="text-xs text-red-600 mt-1">
                  Sem permissão ou falha ao listar clientes. Peça acesso ou recarregue a página.
                </p>
              )}
            </>
          )}
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Placa *">
            <input
              className={inputClass}
              value={form.plate}
              onChange={(e) =>
                setForm((f) => ({ ...f, plate: normalizePlate(e.target.value) }))
              }
              placeholder="ABC1D23 ou ABC1234"
              maxLength={8}
              required
            />
          </FormField>
          <FormField label="Tipo">
            <select
              className={selectClass}
              value={form.vehicleKind}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  vehicleKind: e.target.value as typeof form.vehicleKind,
                }))
              }
            >
              <option value="CAR">Carro</option>
              <option value="MOTORCYCLE">Moto</option>
              <option value="TRUCK">Caminhao</option>
              <option value="OTHER">Outro</option>
            </select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Marca">
            <input
              className={inputClass}
              value={form.brand}
              onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
            />
          </FormField>
          <FormField label="Modelo">
            <input
              className={inputClass}
              value={form.model}
              onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Ano">
            <input
              type="text"
              inputMode="numeric"
              className={inputClass}
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
              placeholder="2020"
            />
          </FormField>
          <FormField label="Cor">
            <input
              className={inputClass}
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
            />
          </FormField>
        </div>
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide pt-1">
          Dados tecnicos
        </p>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Combustivel">
            <input
              className={inputClass}
              value={form.fuelType}
              onChange={(e) => setForm((f) => ({ ...f, fuelType: e.target.value }))}
            />
          </FormField>
          <FormField label="KM atual">
            <input
              type="text"
              inputMode="numeric"
              className={inputClass}
              value={form.currentKm}
              onChange={(e) => setForm((f) => ({ ...f, currentKm: e.target.value }))}
              placeholder="Ex.: 50000"
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Chassi">
            <input
              className={inputClass}
              value={form.chassis}
              onChange={(e) => setForm((f) => ({ ...f, chassis: e.target.value }))}
            />
          </FormField>
          <FormField label="RENAVAM">
            <input
              className={inputClass}
              value={form.renavam}
              onChange={(e) => setForm((f) => ({ ...f, renavam: e.target.value }))}
            />
          </FormField>
        </div>
        <FormField label="Observacoes">
          <textarea
            className={`${inputClass} min-h-[52px] py-1.5`}
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </FormField>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir veiculo"
        message={`Excluir placa ${deleteTarget?.plate}? OS vinculadas serao removidas.`}
        loading={remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}
