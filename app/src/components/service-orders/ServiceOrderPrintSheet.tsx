import type { OrganizationDetail, ServiceOrderDetail } from "../../lib/api";
import { formatDateTime, formatMoney } from "../../lib/format";
import { osStatusLabel } from "../../lib/service-order-status";

type Props = {
  os: ServiceOrderDetail;
  org?: OrganizationDetail | null;
};

/** Folha A4 exibida somente na impressao (sem checklist; fotos condicionais). */
export default function ServiceOrderPrintSheet({ os, org }: Props) {
  const images = (os.attachments ?? []).filter((a) => a.mimeType.startsWith("image/"));

  const orgName = org?.tradeName || org?.name || "Oficina";
  const terms = org?.termsServiceOrder?.trim();

  return (
    <div className="service-order-print hidden print:block bg-white text-[#111] text-[11px] leading-snug">
      <header className="flex justify-between items-start gap-4 border-b-2 border-[#0F3D4C] pb-3 mb-4">
        <div className="flex gap-3 items-start min-w-0">
          {org?.logoUrl ? (
            <img src={org.logoUrl} alt="" className="h-12 w-auto object-contain shrink-0" />
          ) : null}
          <div>
            <h1 className="text-lg font-bold text-[#0F3D4C]">{orgName}</h1>
            {org?.document && <p className="text-[10px] text-[#555]">CNPJ: {org.document}</p>}
            {(org?.phone || org?.email) && (
              <p className="text-[10px] text-[#555]">
                {[org.phone, org.email].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wide text-[#64748B]">Ordem de servico</p>
          <p className="text-2xl font-bold text-[#0F3D4C]">#{os.number}</p>
          <p className="text-[10px] mt-1">{osStatusLabel(os.status)}</p>
          <p className="text-[10px] text-[#64748B]">
            Abertura: {os.enteredAt ? formatDateTime(os.enteredAt) : formatDateTime(os.createdAt)}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 mb-4">
        <div className="border border-[#E2E8F0] rounded p-3">
          <p className="text-[10px] font-semibold uppercase text-[#64748B] mb-1">Cliente</p>
          <p className="font-semibold">{os.vehicle.customer.name}</p>
          {os.vehicle.customer.phone && <p>Tel: {os.vehicle.customer.phone}</p>}
        </div>
        <div className="border border-[#E2E8F0] rounded p-3">
          <p className="text-[10px] font-semibold uppercase text-[#64748B] mb-1">Veiculo</p>
          <p className="font-semibold">{os.vehicle.plate}</p>
          <p>
            {[os.vehicle.brand, os.vehicle.model, os.vehicle.year].filter(Boolean).join(" ")}
            {os.vehicle.color ? ` · ${os.vehicle.color}` : ""}
          </p>
          {os.entryKm != null && <p>KM entrada: {os.entryKm}</p>}
          {os.bay && <p>Box: {os.bay}</p>}
        </div>
      </section>

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
        <p className="text-[10px] font-semibold uppercase text-[#64748B] mb-2">Servicos e pecas</p>
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
                  src={`/api/uploads/${a.storagePath}`}
                  alt={a.fileName}
                  className="w-full h-24 object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-6 pt-4 border-t border-[#E2E8F0] break-inside-avoid">
        <div className="min-w-0">
          {terms ? (
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase text-[#64748B] mb-1">Termos</p>
              <p className="text-[9px] whitespace-pre-wrap text-[#555]">{terms}</p>
            </div>
          ) : null}
          {org?.footerText && (
            <p className="text-[9px] text-[#555]">{org.footerText}</p>
          )}
          <div className="mt-6 grid grid-cols-2 gap-8">
            <div>
              <div className="border-t border-[#333] pt-1 mt-8 text-[10px]">Assinatura do cliente</div>
            </div>
            <div>
              <div className="border-t border-[#333] pt-1 mt-8 text-[10px]">Responsavel da oficina</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
