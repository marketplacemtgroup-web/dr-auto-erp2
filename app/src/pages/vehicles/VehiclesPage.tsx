import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import DataTable from "../../components/modules/DataTable";
import ConfirmDialog from "../../components/modules/ConfirmDialog";
import { api, type VehicleRow } from "../../lib/api";
import { routes } from "../../lib/routes";
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
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VehicleRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: customers } = useApiQuery(["customers-all"], (t) => api.customers(t));
  const { data, isLoading, error } = useApiQuery(["vehicles", search], (t) =>
    api.vehicles(t, search || undefined),
  );

  const vehiclePayload = () => ({
    customerId: form.customerId,
    plate: form.plate,
    brand: form.brand || undefined,
    model: form.model || undefined,
    year: form.year ? Number(form.year) : undefined,
    color: form.color || undefined,
    vehicleKind: form.vehicleKind,
    chassis: form.chassis || undefined,
    renavam: form.renavam || undefined,
    fuelType: form.fuelType || undefined,
    currentKm: form.currentKm ? Number(form.currentKm) : undefined,
    notes: form.notes || undefined,
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
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
    setDrawerOpen(true);
  };

  const save = useMutation({
    mutationFn: () =>
      editing
        ? api.updateVehicle(token!, editing.id, vehiclePayload())
        : api.createVehicle(token!, vehiclePayload()),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setDrawerOpen(false);
      setEditing(null);
      navigate(routes.veiculoDetalhe(saved.id));
    },
  });

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
        onSearch={setSearch}
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
          rows={data ?? []}
          loading={isLoading}
          error={error}
          emptyMessage="Nenhum veiculo cadastrado."
          onRowClick={(row) => navigate(routes.veiculoDetalhe(row.id))}
          onEdit={(row) => void openEdit(row)}
          onDelete={setDeleteTarget}
        />
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        title={editing ? "Editar veiculo" : "Novo veiculo"}
        subtitle="Dados do veiculo e vinculo ao cliente"
        onClose={() => setDrawerOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        loading={save.isPending}
        submitLabel={editing ? "Salvar e abrir ficha" : "Cadastrar e abrir ficha"}
      >
        <FormField label="Cliente *">
          <select
            className={selectClass}
            value={form.customerId}
            onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
            required
          >
            <option value="">Selecione...</option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Placa *">
            <input
              className={inputClass}
              value={form.plate}
              onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value.toUpperCase() }))}
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
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Ano">
            <input
              type="number"
              className={inputClass}
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
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
        <FormField label="Combustivel">
          <input
            className={inputClass}
            value={form.fuelType}
            onChange={(e) => setForm((f) => ({ ...f, fuelType: e.target.value }))}
          />
        </FormField>
        <FormField label="KM atual">
          <input
            type="number"
            className={inputClass}
            value={form.currentKm}
            onChange={(e) => setForm((f) => ({ ...f, currentKm: e.target.value }))}
          />
        </FormField>
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
        <FormField label="Observacoes">
          <textarea
            className={`${inputClass} min-h-[60px] py-2`}
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
