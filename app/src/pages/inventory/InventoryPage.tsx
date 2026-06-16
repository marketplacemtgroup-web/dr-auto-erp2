import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import ModuleFilters, { FilterSelect } from "../../components/modules/ModuleFilters";
import FormDrawer, { FormField, inputClass } from "../../components/modules/FormDrawer";
import KpiStrip from "../../components/modules/KpiStrip";
import DataTable from "../../components/modules/DataTable";
import ConfirmDialog from "../../components/modules/ConfirmDialog";
import { api, type ProductRow } from "../../lib/api";
import { formatDateTime, formatMoney } from "../../lib/format";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  brand: "",
  ncm: "",
  location: "",
  stock: "0",
  minStock: "5",
  costPrice: "",
  salePrice: "",
};

const MOVEMENT_LABEL: Record<string, string> = {
  IN: "Entrada",
  OUT_OS: "Saida OS",
  RESERVE: "Reserva",
  RELEASE: "Liberacao",
  ADJUST: "Ajuste",
  RETURN: "Devolucao",
};

export default function InventoryPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stockDrawer, setStockDrawer] = useState<ProductRow | null>(null);
  const [stockDelta, setStockDelta] = useState("");
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading, error } = useApiQuery(
    ["products", search, String(lowOnly)],
    (t) => api.products(t, search || undefined, lowOnly),
  );

  const { data: movements } = useApiQuery(["stock-movements"], (t) => api.stockMovements(t));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDrawerOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku ?? "",
      category: p.category ?? "",
      brand: p.brand ?? "",
      ncm: p.ncm ?? "",
      location: p.location ?? "",
      stock: String(p.stock),
      minStock: String(p.minStock),
      costPrice: String(p.costPrice),
      salePrice: String(p.salePrice),
    });
    setDrawerOpen(true);
  };

  const save = useMutation({
    mutationFn: () =>
      editing
        ? api.updateProduct(token!, editing.id, {
            name: form.name,
            sku: form.sku || undefined,
            category: form.category || undefined,
            brand: form.brand || undefined,
            ncm: form.ncm || undefined,
            location: form.location || undefined,
            minStock: Number(form.minStock),
            costPrice: form.costPrice ? Number(form.costPrice) : undefined,
            salePrice: form.salePrice ? Number(form.salePrice) : undefined,
          })
        : api.createProduct(token!, {
            name: form.name,
            sku: form.sku || undefined,
            category: form.category || undefined,
            brand: form.brand || undefined,
            ncm: form.ncm || undefined,
            location: form.location || undefined,
            stock: Number(form.stock),
            minStock: Number(form.minStock),
            costPrice: form.costPrice ? Number(form.costPrice) : undefined,
            salePrice: form.salePrice ? Number(form.salePrice) : undefined,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDrawerOpen(false);
      setEditing(null);
    },
  });

  const adjustStock = useMutation({
    mutationFn: () =>
      api.adjustProductStock(token!, stockDrawer!.id, Number(stockDelta)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      setStockDrawer(null);
      setStockDelta("");
    },
  });

  const remove = useMutation({
    mutationFn: () => api.deleteProduct(token!, deleteTarget!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteTarget(null);
    },
  });

  const low = data?.filter((p) => p.stock <= p.minStock).length ?? 0;
  const stockValue = data?.reduce((s, p) => s + Number(p.costPrice) * p.stock, 0) ?? 0;

  return (
    <>
      <ModulePageShell
        title="Estoque"
        description="Pecas, produtos e alertas de reposicao"
        actionLabel="Nova peca"
        onAction={openCreate}
        onSearch={setSearch}
      >
        <ModuleFilters>
          <FilterSelect
            label="Filtro"
            value={lowOnly ? "low" : "all"}
            onChange={(v) => setLowOnly(v === "low")}
            options={[
              { value: "all", label: "Todos os itens" },
              { value: "low", label: "Somente baixo estoque" },
            ]}
          />
        </ModuleFilters>
        <KpiStrip
          items={[
            { label: "Itens cadastrados", value: String(data?.length ?? 0) },
            { label: "Baixo estoque", value: String(low), tone: low > 0 ? "danger" : "success" },
            { label: "Valor em custo", value: formatMoney(stockValue) },
          ]}
        />
        <DataTable
          columns={[
            { key: "sku", header: "SKU", render: (p) => p.sku ?? "—" },
            { key: "name", header: "Nome", render: (p) => p.name },
            {
              key: "loc",
              header: "Local",
              render: (p) => p.location ?? "—",
            },
            {
              key: "stock",
              header: "Estoque",
              className: "text-right",
              render: (p) => (
                <span
                  className={
                    p.stock <= p.minStock ? "text-red-600 font-semibold" : "font-semibold"
                  }
                >
                  {p.stock}
                </span>
              ),
            },
            {
              key: "min",
              header: "Minimo",
              className: "text-right",
              render: (p) => p.minStock,
            },
            {
              key: "cost",
              header: "Custo",
              className: "text-right",
              render: (p) => formatMoney(p.costPrice),
            },
            {
              key: "sale",
              header: "Venda",
              className: "text-right",
              render: (p) => formatMoney(p.salePrice),
            },
          ]}
          rows={data ?? []}
          loading={isLoading}
          error={error}
          emptyMessage="Nenhuma peca cadastrada."
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onRowClick={(p) => {
            setStockDrawer(p);
            setStockDelta("");
          }}
        />
        <p className="text-xs text-[#94A3B8] mt-2">
          Clique na linha para entrada ou saida rapida de estoque.
        </p>

        <div className="mt-8 bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#F1F5F9]">
            <h3 className="text-sm font-semibold text-[#1E293B]">Ultimas movimentacoes</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] text-xs text-[#64748B] uppercase">
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-left">Produto</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-right">Qtd</th>
                <th className="px-4 py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {(movements ?? []).slice(0, 15).map((m) => (
                <tr key={m.id} className="border-t border-[#F1F5F9]">
                  <td className="px-4 py-2 text-[#64748B]">{formatDateTime(m.createdAt)}</td>
                  <td className="px-4 py-2">{m.product.name}</td>
                  <td className="px-4 py-2">{MOVEMENT_LABEL[m.movementType] ?? m.movementType}</td>
                  <td className="px-4 py-2 text-right">{m.quantity}</td>
                  <td className="px-4 py-2 text-right font-medium">{m.balanceAfter}</td>
                </tr>
              ))}
              {(movements ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[#94A3B8]">
                    Nenhuma movimentacao registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        title={editing ? "Editar peca" : "Nova peca"}
        onClose={() => setDrawerOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        loading={save.isPending}
      >
        <FormField label="Nome *">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </FormField>
        <FormField label="SKU">
          <input
            className={inputClass}
            value={form.sku}
            onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Categoria">
            <input
              className={inputClass}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          </FormField>
          <FormField label="Marca">
            <input
              className={inputClass}
              value={form.brand}
              onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
            />
          </FormField>
        </div>
        <FormField label="NCM">
          <input
            className={inputClass}
            value={form.ncm}
            onChange={(e) => setForm((f) => ({ ...f, ncm: e.target.value }))}
          />
        </FormField>
        <FormField label="Localizacao">
          <input
            className={inputClass}
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="Prateleira A1"
          />
        </FormField>
        {!editing && (
          <FormField label="Estoque inicial">
            <input
              type="number"
              className={inputClass}
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
            />
          </FormField>
        )}
        <FormField label="Estoque minimo">
          <input
            type="number"
            className={inputClass}
            value={form.minStock}
            onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))}
          />
        </FormField>
        <FormField label="Preco custo">
          <input
            type="number"
            step="0.01"
            className={inputClass}
            value={form.costPrice}
            onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
          />
        </FormField>
        <FormField label="Preco venda">
          <input
            type="number"
            step="0.01"
            className={inputClass}
            value={form.salePrice}
            onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
          />
        </FormField>
      </FormDrawer>

      <FormDrawer
        open={!!stockDrawer}
        title="Movimentar estoque"
        subtitle={stockDrawer?.name}
        onClose={() => setStockDrawer(null)}
        onSubmit={(e) => {
          e.preventDefault();
          adjustStock.mutate();
        }}
        loading={adjustStock.isPending}
        submitLabel="Aplicar"
      >
        <p className="text-sm text-[#64748B]">
          Estoque atual: <strong>{stockDrawer?.stock ?? 0}</strong>
        </p>
        <FormField label="Quantidade (+ entrada / - saida)">
          <input
            type="number"
            className={inputClass}
            value={stockDelta}
            onChange={(e) => setStockDelta(e.target.value)}
            placeholder="Ex: 5 ou -2"
            required
          />
        </FormField>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir produto"
        message={`Excluir ${deleteTarget?.name}?`}
        loading={remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}
