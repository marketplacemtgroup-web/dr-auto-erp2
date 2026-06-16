import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass } from "../../components/modules/FormDrawer";
import KpiStrip from "../../components/modules/KpiStrip";
import { useAuthStore } from "../../stores/authStore";
import { api, type PurchaseOrderRow } from "../../lib/api";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const statusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  ORDERED: "Pedido",
  RECEIVED: "Recebido",
  CANCELLED: "Cancelado",
};

export default function PurchasesPage() {
  const token = useAuthStore((s) => s.session?.accessToken ?? null);
  const [rows, setRows] = useState<PurchaseOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({ supplierName: "", totalAmount: "" });

  async function load(nextSearch?: string) {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.purchaseOrders(token, nextSearch);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  const create = useMutation({
    mutationFn: () =>
      api.createPurchaseOrder(token!, {
        supplierName: form.supplierName,
        totalAmount: Number(form.totalAmount) || 0,
      }),
    onSuccess: () => {
      void load(search);
      setDrawerOpen(false);
      setForm({ supplierName: "", totalAmount: "" });
    },
  });

  const total = useMemo(
    () => rows.reduce((acc, r) => acc + Number(r.totalAmount ?? 0), 0),
    [rows],
  );
  const pending = rows.filter((r) => r.status === "ORDERED").length;

  return (
    <>
      <ModulePageShell
        title="Compras"
        description="Pedidos de compra e fornecedores"
        onSearch={(q) => {
          setSearch(q);
          void load(q);
        }}
        onAction={() => setDrawerOpen(true)}
        actionLabel="Novo pedido"
      >
        <KpiStrip
          items={[
            { label: "Pedidos", value: String(rows.length) },
            { label: "Em transito", value: String(pending), tone: "warning" },
            { label: "Total listado", value: formatCurrency(total) },
          ]}
        />
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="px-4 py-3 flex justify-end border-b border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => void load(search)}
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-[13px] hover:bg-[#F8FAFC]"
            >
              Atualizar
            </button>
          </div>
          <table className="w-full text-[13px]">
            <thead className="bg-[#F8FAFC] text-[#475569]">
              <tr>
                <th className="text-left font-medium px-4 py-3">Numero</th>
                <th className="text-left font-medium px-4 py-3">Fornecedor</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Total</th>
                <th className="text-right font-medium px-4 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-[#64748B]">
                    Carregando...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-[#64748B]">
                    Nenhum pedido. Clique em Novo pedido.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-[#E2E8F0]">
                    <td className="px-4 py-3 font-medium text-[#0E7490]">{r.number}</td>
                    <td className="px-4 py-3">{r.supplierName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[12px]">
                        {statusLabel[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(Number(r.totalAmount ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={!token || r.status === "RECEIVED"}
                        onClick={() => {
                          if (!token) return;
                          void api.receivePurchaseOrder(token, r.id).then(() => load(search));
                        }}
                        className="h-9 px-3 rounded-lg bg-[#0F3D4C] disabled:bg-[#94A3B8] text-white text-[12px]"
                      >
                        Receber
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        title="Novo pedido de compra"
        onClose={() => setDrawerOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        loading={create.isPending}
      >
        <FormField label="Fornecedor *">
          <input
            className={inputClass}
            value={form.supplierName}
            onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))}
            required
          />
        </FormField>
        <FormField label="Valor total (R$) *">
          <input
            type="number"
            step="0.01"
            className={inputClass}
            value={form.totalAmount}
            onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))}
            required
          />
        </FormField>
      </FormDrawer>
    </>
  );
}
