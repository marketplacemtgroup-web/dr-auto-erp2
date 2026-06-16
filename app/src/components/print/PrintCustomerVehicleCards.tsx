import { formatCustomerAddress } from "../../lib/customerAddress";

export type PrintCustomerInfo = {
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  street?: string | null;
  addressNumber?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
};

export type PrintVehicleInfo = {
  plate: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  color?: string | null;
  entryKm?: number | null;
  bay?: string | null;
  relatedOsNumber?: number | null;
};

type Props = {
  customer: PrintCustomerInfo;
  vehicle: PrintVehicleInfo;
};

function PrintField({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[9px] leading-tight">
      <span>{label}: </span>
      <span>{value || "—"}</span>
    </p>
  );
}

export default function PrintCustomerVehicleCards({ customer, vehicle }: Props) {
  const address = formatCustomerAddress(customer);

  return (
    <section className="grid grid-cols-2 gap-3 mb-4 font-bold">
      <div className="border border-[#E2E8F0] rounded p-2.5 min-w-0">
        <p className="text-[9px] uppercase text-[#64748B] mb-1.5 tracking-wide">Cliente</p>
        <div className="space-y-0.5">
          <PrintField label="Nome" value={customer.name} />
          <PrintField label="Endereco" value={address} />
          <PrintField label="Telefone" value={customer.phone ?? ""} />
          <PrintField label="WhatsApp" value={customer.whatsapp ?? ""} />
          <PrintField label="E-mail" value={customer.email ?? ""} />
        </div>
      </div>
      <div className="border border-[#E2E8F0] rounded p-2.5 min-w-0">
        <p className="text-[9px] uppercase text-[#64748B] mb-1.5 tracking-wide">Veiculo</p>
        <div className="space-y-0.5">
          <PrintField label="Placa" value={vehicle.plate} />
          <PrintField
            label="Modelo"
            value={[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" ")}
          />
          {vehicle.color ? <PrintField label="Cor" value={vehicle.color} /> : null}
          {vehicle.entryKm != null ? (
            <PrintField label="KM entrada" value={String(vehicle.entryKm)} />
          ) : null}
          {vehicle.bay ? <PrintField label="Box" value={vehicle.bay} /> : null}
          {vehicle.relatedOsNumber != null ? (
            <PrintField label="OS relacionada" value={`#${vehicle.relatedOsNumber}`} />
          ) : null}
        </div>
      </div>
    </section>
  );
}
