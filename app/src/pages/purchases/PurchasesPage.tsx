import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass } from "../../components/modules/FormDrawer";
import KpiStrip from "../../components/modules/KpiStrip";
import { useAuthStore } from "../../stores/authStore";
import { api, type ProductRow, type PurchaseOrderRow, type SupplierRow } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { useApiQuery } from "../../hooks/useApiQuery";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  ORDERED: "Pedido",
  ORDER_SENT: "Enviado",
  AWAITING_RECEIPT: "Aguardando NF",
  PARTIALLY_RECEIVED: "Parcial",
  RECEIVED: "Recebido",
  CANCELLED: "Cancelado",
};

type WizardItem = {
  id: string;
  productId?: string;
  description: string;
  quantity: string;
  unitCost: string;
  discount: string;
};

const STEPS = ["Fornecedor", "Itens", "Frete", "Pagamento", "Revisão"];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PurchasesPage() {
  const token = useAuthStore((s) => s.session?.accessToken ?? null);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [freight, setFreight] = useState("0");
  const [otherExpenses, setOtherExpenses] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [installments, setInstallments] = useState("1");
  const [firstDueDate, setFirstDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<WizardItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: "1", unitCost: "0", discount: "0" },
  ]);
  const [productSearch, setProductSearch] = useState("");

  const { data: rows = [], isLoading } = useApiQuery(
    ["purchases", search],
    (t) => api.purchaseOrders(t, search || undefined),
    { enabled: Boolean(token) },
  );

  const { data: suppliers = [] } = useApiQuery(
    ["suppliers-picker"],
    (t) => api.suppliers(t, undefined, "ACTIVE"),
    { enabled: wizardOpen && Boolean(token) },
  );

  const { data: products = [] } = useApiQuery(
    ["products-picker", productSearch],
    (t) => api.products(t, productSearch || undefined),
    { enabled: wizardOpen && step === 1 && Boolean(token) },
  );

  const subtotal = useMemo(
    () =>
      items.reduce((acc, item) => {
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.unitCost) || 0;
        const disc = Number(item.discount) || 0;
        return acc + Math.max(qty * cost - disc, 0);
      }, 0),
    [items],
  );

  const totalPreview = useMemo(() => {
    const f = Number(freight) || 0;
    const o = Number(otherExpenses) || 0;
    const d = Number(discount) || 0;
    return Math.max(subtotal + f + o - d, 0);
  }, [subtotal, freight, otherExpenses, discount]);

  const create = useMutation({
    mutationFn: async () => {
      const po = await api.createPurchaseOrder(token!, {
        supplierId: supplierId || undefined,
        supplierName: supplierName.trim(),
        freight: Number(freight) || 0,
        otherExpenses: Number(otherExpenses) || 0,
        discount: Number(discount) || 0,
        paymentTerms: {
          installments: Number(installments) || 1,
          firstDueDate,
          intervalDays: 30,
        },
        items: items
          .filter((i) => i.description.trim())
          .map((i) => ({
            productId: i.productId,
            description: i.description.trim(),
            quantity: Number(i.quantity) || 1,
            unitCost: Number(i.unitCost) || 0,
            discount: Number(i.discount) || 0,
          })),
      });
      return api.confirmPurchaseOrder(token!, po.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      resetWizard();
    },
  });

  const receive = useMutation({
    mutationFn: (id: string) => api.receivePurchaseOrder(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchases"] }),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.cancelPurchaseOrder(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchases"] }),
  });

  function resetWizard() {
    setWizardOpen(false);
    setStep(0);
    setSupplierId("");
    setSupplierName("");
    setFreight("0");
    setOtherExpenses("0");
    setDiscount("0");
    setInstallments("1");
    setItems([{ id: crypto.randomUUID(), description: "", quantity: "1", unitCost: "0", discount: "0" }]);
  }

  useEffect(() => {
    if (!supplierId) return;
    const s = suppliers.find((x: SupplierRow) => x.id === supplierId);
    if (s) setSupplierName(s.tradeName || s.legalName);
  }, [supplierId, suppliers]);

  function addProduct(p: ProductRow) {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productId: p.id,
        description: p.name,
        quantity: "1",
        unitCost: String(p.costPrice ?? 0),
        discount: "0",
      },
    ]);
    setProductSearch("");
  }

  const pending = rows.filter(
    (r) => r.status === "AWAITING_RECEIPT" || r.status === "PARTIALLY_RECEIVED" || r.status === "ORDERED",
  ).length;

  return (
    <>
      <ModulePageShell
        title="Compras"
        description="Pedidos de compra com itens, estoque e contas a pagar"
        onSearch={(q) => setSearch(q)}
        onAction={() => setWizardOpen(true)}
        actionLabel="Nova compra"
      >
        <KpiStrip
          items={[
            { label: "Pedidos", value: String(rows.length) },
            { label: "Aguardando recebimento", value: String(pending), tone: "warning" },
            {
              label: "Total listado",
              value: formatCurrency(rows.reduce((a, r) => a + Number(r.totalAmount ?? 0), 0)),
            },
          ]}
        />
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[#F8FAFC] text-[#475569]">
              <tr>
                <th className="text-left font-medium px-4 py-3">Número</th>
                <th className="text-left font-medium px-4 py-3">Fornecedor</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Estoque / AP</th>
                <th className="text-right font-medium px-4 py-3">Total</th>
                <th className="text-right font-medium px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-[#64748B]">
                    Carregando...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-[#64748B]">
                    Nenhum pedido. Clique em Nova compra.
                  </td>
                </tr>
              ) : (
                rows.map((r: PurchaseOrderRow) => (
                  <tr key={r.id} className="border-t border-[#E2E8F0]">
                    <td className="px-4 py-3 font-medium text-[#0E7490]">{r.number}</td>
                    <td className="px-4 py-3">
                      {r.supplier?.tradeName || r.supplier?.legalName || r.supplierName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[12px]">
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#64748B]">
                      {r.stockStatus ?? "—"} / {r.financialStatus ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">{formatMoney(Number(r.totalAmount ?? 0))}</td>
                    <td className="px-4 py-3 text-right space-x-1">
                      {r.status !== "RECEIVED" && r.status !== "CANCELLED" && r.status !== "DRAFT" ? (
                        <button
                          type="button"
                          disabled={!token || receive.isPending}
                          onClick={() => receive.mutate(r.id)}
                          className="h-8 px-2 rounded-lg bg-[#0F3D4C] text-white text-[11px]"
                        >
                          Receber
                        </button>
                      ) : null}
                      {r.status !== "CANCELLED" && r.status !== "RECEIVED" ? (
                        <button
                          type="button"
                          disabled={!token || cancel.isPending}
                          onClick={() => {
                            if (window.confirm("Cancelar esta compra?")) cancel.mutate(r.id);
                          }}
                          className="h-8 px-2 rounded-lg border border-[#FECACA] text-[#DC2626] text-[11px]"
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ModulePageShell>

      <FormDrawer
        open={wizardOpen}
        title={`Nova compra — ${STEPS[step]}`}
        onClose={resetWizard}
        onSubmit={(e) => {
          e.preventDefault();
          if (step < STEPS.length - 1) {
            if (step === 0 && !supplierName.trim()) return;
            if (step === 1 && !items.some((i) => i.description.trim())) return;
            setStep((s) => s + 1);
            return;
          }
          create.mutate();
        }}
        loading={create.isPending}
        submitLabel={step < STEPS.length - 1 ? "Próximo" : "Confirmar compra"}
      >
        <div className="flex gap-1 mb-4">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`flex-1 h-1 rounded ${i <= step ? "bg-[#0E7490]" : "bg-[#E2E8F0]"}`}
            />
          ))}
        </div>

        {step === 0 && (
          <>
            <FormField label="Fornecedor cadastrado">
              <select
                className={inputClass}
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">Selecionar...</option>
                {suppliers.map((s: SupplierRow) => (
                  <option key={s.id} value={s.id}>
                    {s.tradeName || s.legalName}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Nome do fornecedor *">
              <input
                className={inputClass}
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                required
              />
            </FormField>
          </>
        )}

        {step === 1 && (
          <>
            <FormField label="Buscar produto no estoque">
              <input
                className={inputClass}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Nome ou SKU"
              />
            </FormField>
            {productSearch && products.length > 0 ? (
              <div className="mb-3 border border-[#E2E8F0] rounded-lg max-h-32 overflow-y-auto">
                {products.slice(0, 8).map((p: ProductRow) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p)}
                    className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#F8FAFC] border-b border-[#F1F5F9] last:border-0"
                  >
                    {p.name} {p.sku ? `(${p.sku})` : ""}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="border border-[#E2E8F0] rounded-lg p-3 space-y-2">
                  <p className="text-[11px] font-semibold text-[#94A3B8]">Item {idx + 1}</p>
                  <input
                    className={inputClass}
                    placeholder="Descrição"
                    value={item.description}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((r) =>
                          r.id === item.id ? { ...r, description: e.target.value } : r,
                        ),
                      )
                    }
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      className={inputClass}
                      placeholder="Qtd"
                      value={item.quantity}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((r) =>
                            r.id === item.id ? { ...r, quantity: e.target.value } : r,
                          ),
                        )
                      }
                    />
                    <input
                      type="number"
                      step="0.01"
                      className={inputClass}
                      placeholder="Custo unit."
                      value={item.unitCost}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((r) =>
                            r.id === item.id ? { ...r, unitCost: e.target.value } : r,
                          ),
                        )
                      }
                    />
                    <input
                      type="number"
                      step="0.01"
                      className={inputClass}
                      placeholder="Desconto"
                      value={item.discount}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((r) =>
                            r.id === item.id ? { ...r, discount: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setItems((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    description: "",
                    quantity: "1",
                    unitCost: "0",
                    discount: "0",
                  },
                ])
              }
              className="text-[13px] text-[#0E7490] font-medium"
            >
              + Adicionar item
            </button>
            <p className="text-[13px] text-[#64748B]">Subtotal itens: {formatCurrency(subtotal)}</p>
          </>
        )}

        {step === 2 && (
          <>
            <FormField label="Frete (R$)">
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={freight}
                onChange={(e) => setFreight(e.target.value)}
              />
            </FormField>
            <FormField label="Outras despesas (R$)">
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={otherExpenses}
                onChange={(e) => setOtherExpenses(e.target.value)}
              />
            </FormField>
            <FormField label="Desconto geral (R$)">
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </FormField>
            <p className="text-[14px] font-semibold text-[#0F3D4C]">
              Total estimado: {formatCurrency(totalPreview)}
            </p>
            <p className="text-[11px] text-[#94A3B8]">
              Frete e despesas serão rateados proporcionalmente nos itens no recebimento.
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <FormField label="Parcelas">
              <input
                type="number"
                min={1}
                className={inputClass}
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
              />
            </FormField>
            <FormField label="Vencimento 1ª parcela">
              <input
                type="date"
                className={inputClass}
                value={firstDueDate}
                onChange={(e) => setFirstDueDate(e.target.value)}
              />
            </FormField>
            <p className="text-[12px] text-[#64748B]">
              Ao confirmar, serão geradas contas a pagar no financeiro vinculadas a esta compra.
            </p>
          </>
        )}

        {step === 4 && (
          <div className="space-y-3 text-[13px]">
            <p>
              <span className="text-[#64748B]">Fornecedor:</span> {supplierName}
            </p>
            <p>
              <span className="text-[#64748B]">Itens:</span>{" "}
              {items.filter((i) => i.description.trim()).length}
            </p>
            <p>
              <span className="text-[#64748B]">Total:</span> {formatCurrency(totalPreview)}
            </p>
            <p>
              <span className="text-[#64748B]">Parcelas:</span> {installments}x — 1º venc.{" "}
              {firstDueDate}
            </p>
          </div>
        )}

        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="mt-2 text-[13px] text-[#64748B]"
          >
            Voltar etapa
          </button>
        ) : null}
      </FormDrawer>
    </>
  );
}
