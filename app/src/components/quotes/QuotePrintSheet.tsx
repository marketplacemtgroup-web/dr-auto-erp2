import { useEffect, useMemo, useState } from "react";
import type {
  AttachmentRow,
  OrganizationDetail,
  PrintCustomerSummary,
  QuoteLineRow,
  ServiceOrderItemRow,
} from "../../lib/api";
import { useAuthToken } from "../../hooks/useApiQuery";
import { formatDate, formatDateTime, formatMoney } from "../../lib/format";
import {
  resolvePrintImageUrls,
} from "../../lib/printAttachments";
import { quoteStatusLabel } from "../../lib/service-order-status";
import PrintCustomerVehicleCards from "../print/PrintCustomerVehicleCards";
import PrintLegalTerms from "../print/PrintLegalTerms";
import PrintOrgHeader from "../print/PrintOrgHeader";
import { resolvePrintBranding } from "../../lib/printBranding";
import { resolveServiceOrderTotal, serviceOrderItemLineTotal } from "../../lib/serviceOrderTotals";

export type QuotePrintData = {
  number?: number | null;
  status?: string;
  amount: string | number;
  createdAt?: string;
  validUntil?: string | null;
  terms?: string | null;
  paymentAgreement?: string | null;
  freeTextEnabled?: boolean;
  freeTextContent?: string | null;
  freeTextAmount?: string | number | null;
  lines?: QuoteLineRow[];
  attachments?: AttachmentRow[];
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
  freeTextEnabled?: boolean;
  freeTextContent?: string | null;
  freeTextAmount?: string | number | null;
  lines?: QuoteLineRow[];
};

type QuotePrintOsSource = {
  number: number;
  createdAt: string;
  totalAmount: string | number;
  complaint?: string | null;
  vehicle: QuotePrintData["serviceOrder"]["vehicle"];
  items: ServiceOrderItemRow[];
  attachments?: AttachmentRow[];
};

export function buildQuotePrintData(
  os: QuotePrintOsSource,
  quote?: QuotePrintSource | null,
): QuotePrintData {
  return {
    number: quote?.number ?? null,
    status: quote?.status ?? "PENDING",
    amount: resolveServiceOrderTotal(
      os.items,
      os.totalAmount,
      quote?.freeTextAmount,
      quote?.freeTextEnabled,
    ),
    createdAt: quote?.createdAt ?? os.createdAt,
    validUntil: quote?.validUntil ?? null,
    terms: quote?.terms ?? null,
    paymentAgreement: quote?.paymentAgreement ?? null,
    freeTextEnabled: quote?.freeTextEnabled ?? false,
    freeTextContent: quote?.freeTextContent ?? null,
    freeTextAmount: quote?.freeTextAmount ?? null,
    lines: quote?.lines,
    attachments: os.attachments,
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
  quantity: number;
  unitPrice: number;
  total: number;
  itemType?: string;
};

function buildPrintLines(quote: QuotePrintData): PrintLine[] {
  if (quote.freeTextEnabled && quote.freeTextContent?.trim()) {
    const amount = Number(quote.freeTextAmount ?? quote.amount);
    return [
      {
        description: quote.freeTextContent.trim(),
        quantity: 1,
        unitPrice: amount,
        total: amount,
        itemType: "SERVICE",
      },
    ];
  }

  if (quote.lines?.length) {
    return quote.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPrice: Number(line.unitPrice),
      total:
        Number(line.unitPrice) * line.quantity - Number(line.discount ?? 0),
      itemType: line.lineType,
    }));
  }

  return (quote.serviceOrder.items ?? []).map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    total: serviceOrderItemLineTotal(item),
    itemType: item.itemType,
  }));
}

/** Folha A4 exibida somente na impressao do orcamento. */
function quotePrintImages(attachments: AttachmentRow[] | undefined) {
  return (attachments ?? []).filter(
    (a) =>
      a.mimeType.startsWith("image/") &&
      (a.showOnQuote || a.category.startsWith("checklist-")),
  );
}

function QuoteItemsTable({ title, items }: { title: string; items: PrintLine[] }) {
  if (items.length === 0) return null;
  const subtotal = items.reduce((sum, line) => sum + line.total, 0);
  return (
    <section className="mb-4">
      <p className="text-[10px] font-semibold uppercase text-[#64748B] mb-2">{title}</p>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
            <th className="text-left py-1.5 px-2 font-semibold">Descrição</th>
            <th className="text-center py-1.5 px-2 w-12 font-semibold">Qtd</th>
            <th className="text-right py-1.5 px-2 w-20 font-semibold">Unit.</th>
            <th className="text-right py-1.5 px-2 w-24 font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((line, idx) => (
            <tr key={`${title}-${idx}`} className="border-b border-[#F1F5F9]">
              <td className="py-1.5 px-2 whitespace-pre-wrap">{line.description}</td>
              <td className="py-1.5 px-2 text-center">{line.quantity}</td>
              <td className="py-1.5 px-2 text-right">{formatMoney(line.unitPrice)}</td>
              <td className="py-1.5 px-2 text-right font-medium">{formatMoney(line.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-[#CBD5E1]">
            <td colSpan={3} className="py-1.5 px-2 text-right font-semibold text-[#64748B]">
              Subtotal {title.toLowerCase()}
            </td>
            <td className="py-1.5 px-2 text-right font-semibold">{formatMoney(subtotal)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

export default function QuotePrintSheet({ quote, org }: Props) {
  const token = useAuthToken();
  const lines = buildPrintLines(quote);
  const images = useMemo(() => quotePrintImages(quote.attachments), [quote.attachments]);
  const serviceLines = useMemo(
    () => lines.filter((line) => line.itemType !== "PART"),
    [lines],
  );
  const partLines = useMemo(
    () => lines.filter((line) => line.itemType === "PART"),
    [lines],
  );
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [imagesReady, setImagesReady] = useState(images.length === 0);
  const printInfo = resolvePrintBranding(org);
  const extraTerms = (quote.terms?.trim() || org?.termsQuote?.trim()) ?? "";
  const vehicle = quote.serviceOrder.vehicle;
  const validUntil = resolveValidUntil(quote);
  const isFreeText = Boolean(quote.freeTextEnabled && quote.freeTextContent?.trim());
  const grandTotal =
    quote.freeTextEnabled && quote.freeTextAmount != null ? quote.freeTextAmount : quote.amount;

  useEffect(() => {
    let cancelled = false;
    if (images.length === 0) {
      setImageUrls({});
      setImagesReady(true);
      return;
    }
    if (!token) {
      setImagesReady(true);
      return;
    }
    setImagesReady(false);
    void resolvePrintImageUrls(token, images).then((urls) => {
      if (cancelled) return;
      setImageUrls(urls);
      setImagesReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [images, token]);

  return (
    <div
      className="quote-print bg-white text-[#111] text-[11px] leading-snug"
      data-print-images-ready={imagesReady ? "1" : "0"}
    >
      <PrintOrgHeader
        org={org}
        right={
          <>
            <p className="text-[10px] uppercase tracking-wide text-[#64748B]">Orçamento</p>
            <p className="text-2xl text-[#0F3D4C]">#{quote.number ?? "—"}</p>
            {quote.status && (
              <p className="text-[10px] mt-1">{quoteStatusLabel(quote.status)}</p>
            )}
            {quote.createdAt && (
              <p className="text-[10px] text-[#64748B]">
                Emissão: {formatDateTime(quote.createdAt)}
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
          <p className="text-[10px] font-semibold uppercase text-[#64748B]">Solicitação / reclamação</p>
          <p className="whitespace-pre-wrap">{quote.serviceOrder.complaint}</p>
        </section>
      )}

      {isFreeText ? (
        <section className="mb-4">
          <p className="text-[10px] font-semibold uppercase text-[#64748B] mb-2">Descrição</p>
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="border-b border-[#F1F5F9]">
                  <td className="py-1.5 px-2 whitespace-pre-wrap">{line.description}</td>
                  <td className="py-1.5 px-2 text-center w-12">{line.quantity}</td>
                  <td className="py-1.5 px-2 text-right w-20">{formatMoney(line.unitPrice)}</td>
                  <td className="py-1.5 px-2 text-right font-medium w-24">{formatMoney(line.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#0F3D4C]">
                <td colSpan={3} className="py-2 px-2 text-right font-semibold">Total geral</td>
                <td className="py-2 px-2 text-right font-bold text-[#0F3D4C]">{formatMoney(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      ) : lines.length === 0 ? (
        <section className="mb-4">
          <p className="text-[10px] font-semibold uppercase text-[#64748B] mb-2">Serviços e Peças</p>
          <p className="py-3 text-center text-[#94A3B8]">Nenhum item no orçamento.</p>
        </section>
      ) : (
        <>
          <QuoteItemsTable title="Serviços" items={serviceLines} />
          <QuoteItemsTable title="Peças" items={partLines} />
          <section className="mb-4">
            <table className="w-full border-collapse text-[11px]">
              <tbody>
                <tr className="border-t-2 border-[#0F3D4C]">
                  <td className="py-2 px-2 text-right font-semibold">Total geral</td>
                  <td className="py-2 px-2 text-right font-bold text-[#0F3D4C] w-24">
                    {formatMoney(grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </>
      )}

      {images.length > 0 && (
        <section className="mb-4 print-photos">
          <p className="text-[10px] font-semibold uppercase text-[#64748B] mb-2">Registro fotografico</p>
          <div className="grid grid-cols-3 gap-2">
            {images.map((a) => {
              const src = imageUrls[a.id];
              if (!src) return null;
              return (
                <div key={a.id} className="print-photo-card border border-[#E2E8F0] rounded overflow-hidden">
                  <img
                    src={src}
                    alt={a.fileName}
                    className="w-full h-28 object-cover print-photo-img"
                    loading="eager"
                    decoding="sync"
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {quote.paymentAgreement?.trim() && (
        <section className="mb-4">
          <p className="text-[10px] font-semibold uppercase text-[#64748B]">Forma de Pagamento</p>
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
              Responsável da oficina
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
