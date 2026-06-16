import type { ReactNode } from "react";
import type { OrganizationDetail } from "../../lib/api";
import { resolvePrintBranding } from "../../lib/printBranding";

type Props = {
  org?: OrganizationDetail | null;
  right: ReactNode;
};

export default function PrintOrgHeader({ org, right }: Props) {
  const info = resolvePrintBranding(org);
  const contactLine = info.phone ?? "";

  return (
    <header className="flex justify-between items-end gap-4 border-b-2 border-[#0F3D4C] pb-3 mb-4">
      <div className="flex gap-3 items-end min-w-0">
        <img
          src={info.logoUrl}
          alt={info.name}
          className="h-28 w-auto max-w-[240px] object-contain shrink-0 -mt-1"
        />
        <div className="font-bold">
          <h1 className="text-lg text-[#0F3D4C]">{info.name}</h1>
          {info.document && <p className="text-[10px] text-[#555]">CNPJ: {info.document}</p>}
          <p className="text-[10px] text-[#555]">{info.address}</p>
          {contactLine && <p className="text-[10px] text-[#555]">{contactLine}</p>}
        </div>
      </div>
      <div className="text-right shrink-0 font-bold">{right}</div>
    </header>
  );
}
