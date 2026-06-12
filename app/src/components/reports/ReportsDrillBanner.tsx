import { X } from "lucide-react";
import type { PaymentMethod } from "../../lib/api";
import { PAYMENT_LABELS } from "../../lib/paymentMethods";
import { serviceOrderStatusLabel } from "../../lib/labels";

export type ReportDrill =
  | { kind: "payment"; method: PaymentMethod }
  | { kind: "status"; status: string }
  | null;

type Props = {
  drill: ReportDrill;
  onClear: () => void;
};

export default function ReportsDrillBanner({ drill, onClear }: Props) {
  if (!drill) return null;

  const label =
    drill.kind === "payment"
      ? PAYMENT_LABELS[drill.method]
      : serviceOrderStatusLabel[drill.status] ?? drill.status;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#0E7490]/30 bg-[#ECFEFF] px-4 py-2.5">
      <p className="text-[13px] text-[#0F3D4C]">
        Filtro ativo:{" "}
        <strong>
          {drill.kind === "payment" ? `Pagamento ${label}` : `Status ${label}`}
        </strong>
      </p>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1 text-[12px] text-[#0E7490] hover:text-[#0F3D4C]"
      >
        <X size={14} />
        Limpar
      </button>
    </div>
  );
}
