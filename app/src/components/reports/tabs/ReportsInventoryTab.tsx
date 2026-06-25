import { formatMoney } from "../../../lib/format";
import ReportSection from "../ReportSection";
import ReportHorizontalBars from "../charts/ReportHorizontalBars";
import ReportRankList from "../ReportRankList";
import type { ReportTabProps } from "./reportTabTypes";

export default function ReportsInventoryTab({ report, period, token }: ReportTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ReportSection title="Giro de estoque" period={period} token={token} exportType="top-moving-products" exportFile="giro-estoque.csv">
        <ReportHorizontalBars
          data={report.inventory.topMovingProducts.map((p) => ({ label: p.name, value: p.soldQty }))}
        />
      </ReportSection>
      <ReportSection title="Compras por fornecedor" period={period} token={token} exportType="purchases-by-supplier" exportFile="compras-fornecedor.csv">
        <ReportHorizontalBars
          data={report.inventory.purchasesBySupplier.map((s) => ({ label: s.supplier, value: s.total }))}
          formatValue={formatMoney}
        />
      </ReportSection>
      <ReportSection title="Sugestao de compra" period={period} token={token} exportType="reorder-suggestion" exportFile="sugestao-compra.csv">
        <ReportRankList
          rows={report.inventory.reorderSuggestion.map((p, i) => ({
            key: String(i),
            label: p.name,
            value: `+${p.suggestedQty} (atual ${p.currentStock})`,
          }))}
          empty="Estoque OK."
        />
      </ReportSection>
      <ReportSection title="Resumo estoque" period={period} token={token} exportType="stock-value" exportFile="valor-estoque.csv">
        <div className="space-y-3 text-[14px]">
          <div className="flex justify-between">
            <span className="text-[#64748B]">Valor em estoque</span>
            <span className="font-bold">{formatMoney(report.inventory.stockValue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B]">Itens abaixo do minimo</span>
            <span className="font-bold text-[#DC2626]">{report.inventory.lowStockCount}</span>
          </div>
        </div>
      </ReportSection>
    </div>
  );
}
