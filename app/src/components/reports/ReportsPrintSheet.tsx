import type { ReportsFull } from "../../lib/api";
import { branding } from "../../lib/branding";
import { formatPeriodLabel } from "../../lib/reportPeriod";
import { formatMoney, formatNegativeMoney, formatDate } from "../../lib/format";
import { PAYMENT_LABELS } from "../../lib/paymentMethods";
import type { PaymentMethod } from "../../lib/api";

type Props = {
  report: ReportsFull;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-[#E2E8F0]">
      <td className="py-1.5 pr-4 text-[#64748B]">{label}</td>
      <td className="py-1.5 font-semibold text-right">{value}</td>
    </tr>
  );
}

export default function ReportsPrintSheet({ report }: Props) {
  const { financial: f, operations: o, commercial: c, inventory: i } = report;

  return (
    <div className="reports-print hidden bg-white text-[#1E293B] p-8 text-[13px]">
      <h1 className="text-xl font-bold mb-1">Relatorio gerencial — {branding.appName}</h1>
      <p className="text-[#64748B] mb-6">
        Periodo: {formatPeriodLabel(report.period.from.slice(0, 10), report.period.to.slice(0, 10))}
      </p>

      <h2 className="text-[15px] font-semibold mb-2">Financeiro</h2>
      <table className="w-full mb-6">
        <tbody>
          <Row label="Faturamento bruto" value={formatMoney(f.orderGross ?? f.revenue)} />
          <Row label="Recebimentos líquidos" value={formatMoney(f.revenue)} />
          <Row label="Despesas pagas" value={formatNegativeMoney(f.expenses ?? f.expense)} />
          <Row label="Saldo C/C" value={formatMoney(f.cashProfit ?? f.result)} />
          <Row label="Lucro pecas" value={formatMoney(f.partsProfit)} />
          <Row label="Lucro servicos" value={formatMoney(f.servicesProfit)} />
          <Row label="Lucro scanner" value={formatMoney(f.scannerProfit ?? 0)} />
          <Row label="Lucro terceirizado" value={formatMoney(f.outsourcedProfit ?? 0)} />
          <Row label="Lucro bruto" value={formatMoney(f.grossProfit)} />
          <Row label="Lucro total" value={formatMoney(f.totalProfit)} />
          <Row label="Descontos concedidos" value={formatMoney(f.discountsGiven)} />
          <Row label="A receber" value={formatMoney(f.openReceivables.amount)} />
          <Row label="A pagar" value={formatMoney(f.openPayables.amount)} />
        </tbody>
      </table>

      <h2 className="text-[15px] font-semibold mb-2">Operacao</h2>
      <table className="w-full mb-6">
        <tbody>
          <Row label="OS entregues" value={String(o.deliveredCount)} />
          <Row label="Ticket medio" value={formatMoney(o.averageTicket)} />
          <Row label="Tempo medio entrega (dias)" value={String(o.averageDeliveryDays)} />
          <Row label="OS em andamento" value={String(o.openOrdersCount)} />
          <Row label="OS atrasadas" value={String(o.delayedOrders.length)} />
        </tbody>
      </table>

      <h2 className="text-[15px] font-semibold mb-2">Comercial</h2>
      <table className="w-full mb-6">
        <tbody>
          <Row label="Conversao orcamentos" value={`${c.quoteConversion.rate}%`} />
          <Row label="Clientes ativos" value={String(c.totalCustomers)} />
          <Row label="Retorno no periodo" value={`${c.returningCustomers.rate}%`} />
        </tbody>
      </table>

      <h2 className="text-[15px] font-semibold mb-2">Formas de pagamento</h2>
      <table className="w-full mb-6 text-[12px]">
        <thead>
          <tr className="border-b border-[#E2E8F0] text-left text-[#64748B]">
            <th className="py-1">Forma</th>
            <th className="py-1 text-right">Valor</th>
            <th className="py-1 text-right">Qtd</th>
          </tr>
        </thead>
        <tbody>
          {f.paymentMethods.map((p) => (
            <tr key={p.method} className="border-b border-[#F1F5F9]">
              <td className="py-1">{PAYMENT_LABELS[p.method as PaymentMethod] ?? p.method}</td>
              <td className="py-1 text-right">{formatMoney(p.amount)}</td>
              <td className="py-1 text-right">{p.count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-[15px] font-semibold mb-2">Top clientes</h2>
      <table className="w-full mb-6 text-[12px]">
        <thead>
          <tr className="border-b border-[#E2E8F0] text-left text-[#64748B]">
            <th className="py-1">Cliente</th>
            <th className="py-1 text-right">Faturamento</th>
            <th className="py-1 text-right">OS</th>
          </tr>
        </thead>
        <tbody>
          {(f.billedCustomers?.length ? f.billedCustomers : c.topCustomers).slice(0, 10).map((client) => (
            <tr key={client.id} className="border-b border-[#F1F5F9]">
              <td className="py-1">{client.name}</td>
              <td className="py-1 text-right">{formatMoney(client.revenue)}</td>
              <td className="py-1 text-right">{client.orderCount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-[15px] font-semibold mb-2">Despesas pagas</h2>
      <table className="w-full mb-6 text-[12px]">
        <thead>
          <tr className="border-b border-[#E2E8F0] text-left text-[#64748B]">
            <th className="py-1">Descricao</th>
            <th className="py-1">Fornecedor</th>
            <th className="py-1">Data</th>
            <th className="py-1 text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {(f.expensesList ?? []).slice(0, 30).map((exp) => (
            <tr key={exp.id} className="border-b border-[#F1F5F9]">
              <td className="py-1">{exp.description}</td>
              <td className="py-1">{exp.supplierName ?? exp.categoryName ?? "—"}</td>
              <td className="py-1">{exp.paidAt ? formatDate(exp.paidAt) : "—"}</td>
              <td className="py-1 text-right">{formatNegativeMoney(exp.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-[15px] font-semibold mb-2">Estoque</h2>
      <table className="w-full">
        <tbody>
          <Row label="Valor em estoque" value={formatMoney(i.stockValue)} />
          <Row label="Itens abaixo do minimo" value={String(i.lowStockCount)} />
        </tbody>
      </table>
    </div>
  );
}
