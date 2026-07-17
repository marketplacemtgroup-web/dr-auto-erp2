import { useEffect, useMemo, useState } from "react";
import type { OrganizationDetail, ServiceOrderDetail, ServiceOrderItemRow } from "../../lib/api";
import { formatDateTime, formatMoney } from "../../lib/format";
import { useAuthToken } from "../../hooks/useApiQuery";
import {
  isPrintImageAttachment,
  partitionServiceOrderItems,
  resolvePrintImageUrls,
} from "../../lib/printAttachments";
import { resolveServiceOrderTotal, serviceOrderItemLineTotal } from "../../lib/serviceOrderTotals";
import { osStatusLabel } from "../../lib/service-order-status";
import PrintCustomerVehicleCards from "../print/PrintCustomerVehicleCards";
import PrintLegalTerms from "../print/PrintLegalTerms";
import PrintOrgHeader from "../print/PrintOrgHeader";
import { resolvePrintBranding } from "../../lib/printBranding";

type Props = {
  os: ServiceOrderDetail;
  org?: OrganizationDetail | null;
};

function ItemsTable({
  title,
  items,
}: {
  title: string;
  items: ServiceOrderItemRow[];
}) {
  if (items.length === 0) return null;
  const subtotal = items.reduce((sum, item) => sum + serviceOrderItemLineTotal(item), 0);

  return (
    <section className="mb-4">
      <p className="text-[10px] font-semibold uppercase text-[#64748B] mb-2">{title}</p>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
            <th className="text-left py-1.5 px-2 font-semibold">Descricao</th>
            <th className="text-center py-1.5 px-2 w-12 font-semibold">Qtd</th>
            <th className="text-right py-1.5 px-2 w-20 font-semibold">Unit.</th>
            <th className="text-right py-1.5 px-2 w-24 font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-[#F1F5F9]">
              <td className="py-1.5 px-2">{item.description}</td>
              <td className="py-1.5 px-2 text-center">{item.quantity}</td>
              <td className="py-1.5 px-2 text-right">{formatMoney(item.unitPrice)}</td>
              <td className="py-1.5 px-2 text-right font-medium">
                {formatMoney(serviceOrderItemLineTotal(item))}
              </td>
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

/** Folha A4 exibida somente na impressao. */
export default function ServiceOrderPrintSheet({ os, org }: Props) {
  const token = useAuthToken();
  const images = useMemo(
    () => (os.attachments ?? []).filter(isPrintImageAttachment),
    [os.attachments],
  );
  const { services, parts } = useMemo(
    () => partitionServiceOrderItems(os.items ?? []),
    [os.items],
  );
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [imagesReady, setImagesReady] = useState(images.length === 0);

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

  const printInfo = resolvePrintBranding(org);
  const extraTerms = org?.termsServiceOrder?.trim();
  const grandTotal = resolveServiceOrderTotal(os.items, os.totalAmount);

  return (
    <div
      className="service-order-print bg-white text-[#111] text-[11px] leading-snug"
      data-print-images-ready={imagesReady ? "1" : "0"}
    >
      <PrintOrgHeader
        org={org}
        right={
          <>
            <p className="text-[10px] uppercase tracking-wide text-[#64748B]">Ordem de servico</p>
            <p className="text-2xl text-[#0F3D4C]">#{os.number}</p>
            <p className="text-[10px] mt-1">{osStatusLabel(os.status)}</p>
            <p className="text-[10px] text-[#64748B]">
              Abertura: {os.enteredAt ? formatDateTime(os.enteredAt) : formatDateTime(os.createdAt)}
            </p>
          </>
        }
      />

      <PrintCustomerVehicleCards
        customer={os.vehicle.customer}
        vehicle={{
          plate: os.vehicle.plate,
          brand: os.vehicle.brand,
          model: os.vehicle.model,
          year: os.vehicle.year,
          color: os.vehicle.color,
          entryKm: os.entryKm,
          bay: os.bay,
        }}
      />

      {(os.complaint || os.diagnosis) && (
        <section className="mb-4 space-y-2">
          {os.complaint && (
            <div>
              <p className="text-[10px] font-semibold uppercase text-[#64748B]">Reclamacao</p>
              <p className="whitespace-pre-wrap">{os.complaint}</p>
            </div>
          )}
          {os.diagnosis && (
            <div>
              <p className="text-[10px] font-semibold uppercase text-[#64748B]">Diagnostico</p>
              <p className="whitespace-pre-wrap">{os.diagnosis}</p>
            </div>
          )}
        </section>
      )}

      {os.items.length === 0 ? (
        <section className="mb-4">
          <p className="text-[10px] font-semibold uppercase text-[#64748B] mb-2">Serviços e Peças</p>
          <p className="py-3 text-center text-[#94A3B8]">Nenhum item lancado.</p>
        </section>
      ) : (
        <>
          <ItemsTable title="Serviços" items={services} />
          <ItemsTable title="Peças" items={parts} />
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

      {os.paymentAgreement?.trim() && (
        <section className="mb-4">
          <p className="text-[10px] font-semibold uppercase text-[#64748B]">Forma de Pagamento</p>
          <p className="whitespace-pre-wrap">{os.paymentAgreement.trim()}</p>
        </section>
      )}

      <footer className="mt-4 pt-3 border-t border-[#E2E8F0]">
        <div className="min-w-0">
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
          <div className="print-signatures mt-6 grid grid-cols-2 gap-8">
            <div>
              <div className="border-t border-[#333] pt-1 mt-8 text-[10px]">Assinatura do cliente</div>
            </div>
            <div>
              <div className="border-t border-[#333] pt-1 mt-8 text-[10px]">Responsável da oficina</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
