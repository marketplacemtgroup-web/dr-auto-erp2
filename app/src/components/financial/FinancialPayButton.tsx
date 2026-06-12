import { CheckCircle2 } from "lucide-react";

type Props = {
  type: "RECEIVABLE" | "PAYABLE";
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
};

export default function FinancialPayButton({ type, label, disabled, loading, onClick }: Props) {
  const isReceivable = type === "RECEIVABLE";
  const text =
    loading ? "..." : label ?? (isReceivable ? "Receber" : "Baixar");

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 h-8 min-w-[88px] px-3 rounded-lg text-[12px] font-semibold shadow-sm transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${
        isReceivable
          ? "bg-[#16A34A] hover:bg-[#15803D] text-white"
          : "bg-[#0E7490] hover:bg-[#0F3D4C] text-white"
      }`}
    >
      <CheckCircle2 size={14} strokeWidth={2.25} />
      {text}
    </button>
  );
}
