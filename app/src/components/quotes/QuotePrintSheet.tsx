import type {
  OrganizationDetail,
  PrintCustomerSummary,
  QuoteLineRow,
  ServiceOrderItemRow,
} from "../../lib/api";
import { formatDate, formatDateTime, formatMoney } from "../../lib/format";
import { quoteStatusLabel } from "../../lib/service-order-status";
import PrintCustomerVehicleCards from "../print/PrintCustomerVehicleCards";
import PrintLegalTerms from "../print/PrintLegalTerms";
import PrintOrgHeader from "../print/PrintOrgHeader";
import { resolvePrintBranding } from "../../lib/printBranding";

export type QuotePrintData = {
  number?: number | null;
  status?: string;
  amount: string | number;
  createdAt?: string;
  validUntil?: string | null;
  terms?: string | null;
  paymentAgreement?: string | null;
  lines?: QuoteLineRow[];
  serviceOrder: {
    number: number;
    complaint?: string | null;
    vehicle: {
      plate: string;
      brand?: string | null;
      model?: string | null;
      year?: number | null;
      color?: string | null;
      customer: PrintCustomerSummary;
    };
    items?: ServiceOrderItemRow[];
  };
};

type QuotePrintSource = {
  number?: number | null;
  status?: string;
  amount?: string | number;
  createdAt?: string;
  validUntil?: string | null;
  terms?: string | null;
  paymentAgreement?: string | null;
  lines?: QuoteLineRow[];
};

type QuotePrintOsSource = {
  number: number;
  createdAt: string;
  totalAmount: string | number;
  complaint?: string | null;
  vehicle: QuotePrintData["serviceOrder"]["vehicle"];
  items: ServiceOrderItemRow[];
};

export function buildQuotePrintData(
  os: QuotePrintOsSource,
  quote?: QuotePrintSource | null,
): QuotePrintData {
  return {
    number: quote?.number ?? null,
    status: quote?.status ?? "PENDING",
    amount: quote?.amount ?? os.totalAmount,
    createdAt: quote?.createdAt ?? os.createdAt,
    validUntil: quote?.validUntil ?? null,
    terms: quote?.terms ?? null,
    paymentAgreement: quote?.paymentAgreement ?? null,
    lines: quote?.lines,
    serviceOrder: {
      number: os.number,
      complaint: os.complaint,
      vehicle: os.vehicle,
      items: os.items,
    },
  };
}

function resolveValidUntil(quote: QuotePrintData): string | null {
  if (quote.validUntil) return quote.validUntil;
  if (!quote.createdAt) return null;
  const date = new Date(quote.createdAt);
  date.setDate(date.getDate() + 15);
  return date.toISOString().slice(0, 10);
}

type Props = {
  quote: QuotePrintData;
  org?: OrganizationDetail | null;
};

type PrintLine = {
  description: string;
  tipo: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

import { itemTypeLabel } from "../../lib/itemType";

function lineTypeLabel(lineType: string) {
  return itemTypeLabel(lineType);
}

function buildPrintLines(quote: QuotePrintData): PrintLine[] {
  if (quote.lines?.length) {
    return quote.lines.map((line) => ({
      description: line.description,
      tipo: lineTypeLabel(line.lineType),
      quantity: line.quantity,
      unitPrice: Number(line.unitPrice),
      total:
        Number(line.unitPrice) * line.quantity - Number(line.discount ?? 0),
    }));
  }

  return (quote.serviceOrder.items ?? []).map((item) => ({
    description: item.description,
    tipo: itemTypeLabel(item.itemType),
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    total: Number(item.unitPrice) * item.quantity,
  }));
}

/** Folha A4 exibida somente na impressao do orcamento. */
export default function QuotePrintSheet({ quote, org }: Props) {
  const lines = buildPrintLines(quote);
  const printInfo = resolvePrintBranding(org);
  const extraTerms = (quote.terms?.trim() || org?.termsQuote?.trim()) ?? "";
  const vehicle = quote.serviceOrder.vehicle;
  const validUntil = resolveValidUntil(quote);

  return (
    <div className="quote-print bg-white text-[#111] text-[11px] leading-snug">
      <PrintOrgHeader
        org={org}
        right={
          <>
            <p className="text-[10px] uppercase tracking-wide text-[#64748B]">Orcamento</p>
            <p className="text-2xl text-[#0F3D4C]">#{quote.number ?? "—"}</p>
            {quote.status && (
              <p className="text-[10px] mt-1">{quoteStatusLabel(quote.status)}</p>
            )}
            {quote.createdAt && (
              <p className="text-[10px] text-[#64748B]">
                Emissao: {formatDateTime(quote.createdAt)}
              </p>
            )}
            {validUntil && (
              <p className="text-[10px] text-[#64748B]">
                Validade: {formatDate(validUntil)}
              </p>
            )}
          </>
        }
      />

      <PrintCustomerVehicleCards
        customer={vehicle.customer}
        vehicle={{
          plate: vehicle.plate,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          relatedOsNumber: quote.serviceOrder.number,
        }}
      />

      {quote.serviceOrder.complaint && (
        <section className="mb-4">
          <p className="text-[10px] font-semibold uppercase text-[#64748B]">Solicitacao / reclamacao</p>
          <p className="whitespace-pre-wrap">{quote.serviceOrder.complaint}</p>
        </section>
      )}

      <section className="mb-4">
        <p className="text-[10px] font-semibold uppercase text-[#64748B] mb-2">
          Servicos e pecas
        </p>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
              <th className="text-left py-1.5 px-2 font-semibold">Descricao</th>
              <th className="text-left py-1.5 px-2 w-16 font-semibold">Tipo</th>
              <th className="text-center py-1.5 px-2 w-12 font-semibold">Qtd</th>
              <th className="text-right py-1.5 px-2 w-20 font-semibold">Unit.</th>
              <th className="text-right py-1.5 px-2 w-24 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-3 px-2 text-[#94A3B8] text-center">
                  Nenhum item no orcamento.
                </td>
              </tr>
            ) : (
              lines.map((line, idx) => (
                <tr key={idx} className="border-b border-[#F1F5F9]">
                  <td className="py-1.5 px-2">{line.description}</td>
                  <td className="py-1.5 px-2 text-[#64748B]">{line.tipo}</td>
                  <td className="py-1.5 px-2 text-center">{line.quantity}</td>
                  <td className="py-1.5 px-2 text-right">{formatMoney(line.unitPrice)}</td>
                  <td className="py-1.5 px-2 text-right font-medium">
                    {formatMoney(line.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#0F3D4C]">
              <td colSpan={4} className="py-2 px-2 text-right font-semibold">
                Total do orcamento
              </td>
              <td className="py-2 px-2 text-right font-bold text-[#0F3D4C]">
                {formatMoney(quote.amount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {quote.paymentAgreement?.trim() && (
        <section className="mb-4">
          <p className="text-[10px] font-semibold uppercase text-[#64748B]">Pagamento combinado</p>
          <p className="whitespace-pre-wrap">{quote.paymentAgreement.trim()}</p>
        </section>
      )}

      <footer className="mt-4 pt-3 border-t border-[#E2E8F0]">
        <PrintLegalTerms />
        {extraTerms ? (
          <div className="mt-2 mb-2">
            <p className="text-[12px] font-bold text-[#111] mb-0.5">Termos complementares</p>
            <p className="text-[11px] leading-[1.35] whitespace-pre-wrap text-[#444] text-justify">
              {extraTerms}
            </p>
          </div>
        ) : null}
        {printInfo.footerText && (
          <p className="text-[11px] text-[#555] mb-3">{printInfo.footerText}</p>
        )}
        <div className="print-signatures grid grid-cols-2 gap-8">
          <div>
            <div className="border-t border-[#333] pt-1 mt-8 text-[10px]">
              Assinatura do cliente
            </div>
          </div>
          <div>
            <div className="border-t border-[#333] pt-1 mt-8 text-[10px]">
              Responsavel da oficina
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
