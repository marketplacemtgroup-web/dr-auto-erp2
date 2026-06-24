import type { OrganizationDetail, ServiceOrderDetail } from "../../lib/api";
import { attachmentFileUrl } from "../../lib/mediaUrl";
import { formatDateTime, formatMoney } from "../../lib/format";
import { osStatusLabel } from "../../lib/service-order-status";
import PrintCustomerVehicleCards from "../print/PrintCustomerVehicleCards";
import PrintLegalTerms from "../print/PrintLegalTerms";
import PrintOrgHeader from "../print/PrintOrgHeader";
import { resolvePrintBranding } from "../../lib/printBranding";

type Props = {
  os: ServiceOrderDetail;
  org?: OrganizationDetail | null;
};

/** Folha A4 exibida somente na impressao (sem checklist; fotos condicionais). */
export default function ServiceOrderPrintSheet({ os, org }: Props) {
  const images = (os.attachments ?? []).filter((a) => a.mimeType.startsWith("image/"));

  const printInfo = resolvePrintBranding(org);
  const extraTerms = org?.termsServiceOrder?.trim();

  return (
    <div className="service-order-print bg-white text-[#111] text-[11px] leading-snug">
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

      <section className="mb-4">
        <p className="text-[10px] font-semibold uppercase text-[#64748B] mb-2">Serviços e Peças</p>
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
            {os.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-3 px-2 text-[#94A3B8] text-center">
                  Nenhum item lancado.
                </td>
              </tr>
            ) : (
              os.items.map((item) => (
                <tr key={item.id} className="border-b border-[#F1F5F9]">
                  <td className="py-1.5 px-2">{item.description}</td>
                  <td className="py-1.5 px-2 text-center">{item.quantity}</td>
                  <td className="py-1.5 px-2 text-right">{formatMoney(item.unitPrice)}</td>
                  <td className="py-1.5 px-2 text-right font-medium">
                    {formatMoney(Number(item.unitPrice) * item.quantity)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#0F3D4C]">
              <td colSpan={3} className="py-2 px-2 text-right font-semibold">
                Total
              </td>
              <td className="py-2 px-2 text-right font-bold text-[#0F3D4C]">
                {formatMoney(os.totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {images.length > 0 && (
        <section className="mb-4 break-inside-avoid">
          <p className="text-[10px] font-semibold uppercase text-[#64748B] mb-2">Registro fotografico</p>
          <div className="grid grid-cols-4 gap-2">
            {images.map((a) => (
              <div key={a.id} className="border border-[#E2E8F0] rounded overflow-hidden">
                <img
                  src={attachmentFileUrl(a)}
                  alt={a.fileName}
                  className="w-full h-24 object-cover"
                />
              </div>
            ))}
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
