import { api, type ReportsQueryParams } from "./api";
import { downloadCsv } from "./csvExport";

export const REPORT_EXPORTS = [
  { type: "full-summary", file: "resumo-gerencial.csv", label: "Resumo geral" },
  { type: "financial", file: "financeiro.csv", label: "Financeiro" },
  { type: "payment-methods", file: "formas-pagamento.csv", label: "Formas de pagamento" },
  { type: "overdue-receivables", file: "recebiveis-vencidos.csv", label: "Recebiveis vencidos" },
  { type: "cash-flow", file: "fluxo-caixa.csv", label: "Fluxo de caixa" },
  { type: "profit-margin", file: "margem-por-os.csv", label: "Margem por OS" },
  { type: "service-orders", file: "ordens-servico.csv", label: "Ordens de servico" },
  { type: "service-orders-detailed", file: "ordens-servico-detalhado.csv", label: "OS detalhado (entrada/entrega)" },
  { type: "delayed-orders", file: "os-atrasadas.csv", label: "OS atrasadas" },
  { type: "mechanic-productivity", file: "produtividade-mecanicos.csv", label: "Mecanicos" },
  { type: "top-services", file: "servicos-mais-vendidos.csv", label: "Servicos" },
  { type: "top-parts", file: "pecas-mais-usadas.csv", label: "Pecas" },
  { type: "quote-funnel", file: "funil-orcamentos.csv", label: "Funil orcamentos" },
  { type: "top-customers", file: "top-clientes.csv", label: "Top clientes" },
  { type: "customer-origins", file: "origem-clientes.csv", label: "Origem clientes" },
  { type: "returning-customers", file: "clientes-retorno.csv", label: "Clientes retorno" },
  { type: "inactive-customers", file: "clientes-inativos.csv", label: "Clientes inativos" },
  { type: "low-stock", file: "estoque-baixo.csv", label: "Estoque baixo" },
  { type: "reorder-suggestion", file: "sugestao-compra.csv", label: "Sugestao compra" },
  { type: "top-moving-products", file: "giro-estoque.csv", label: "Giro estoque" },
  { type: "stock-value", file: "valor-estoque.csv", label: "Valor estoque" },
  { type: "purchases-by-supplier", file: "compras-fornecedor.csv", label: "Compras fornecedor" },
] as const;

function flattenExportRow(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        out[`${key}_${nestedKey}`] = nestedValue;
      }
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function exportReportCsv(
  token: string,
  type: string,
  filename: string,
  params?: ReportsQueryParams,
) {
  const data = await api.reportsExport(token, type, params);
  const rows = (data as Record<string, unknown>[]).map(flattenExportRow);
  if (!rows.length) return false;
  downloadCsv(filename, rows);
  return true;
}

export async function exportAllReports(token: string, params?: ReportsQueryParams) {
  const stamp = params?.from && params?.to ? `${params.from}_${params.to}` : "periodo";
  for (const item of REPORT_EXPORTS) {
    await exportReportCsv(token, item.type, `${stamp}-${item.file}`, params);
  }
}
