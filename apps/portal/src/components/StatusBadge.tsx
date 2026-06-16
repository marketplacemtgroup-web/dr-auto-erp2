type StatusVariant =
  | "execucao"
  | "aguardando-peca"
  | "diagnostico"
  | "aguardando-aprovacao"
  | "confirmado"
  | "pendente"
  | "atrasado";

const variants: Record<StatusVariant, { text: string; className: string }> = {
  execucao: {
    text: "Em execucao",
    className: "text-[#3B82F6] bg-[#3B82F6]/10",
  },
  "aguardando-peca": {
    text: "Aguardando peca",
    className: "text-[#F97316] bg-[#F97316]/10",
  },
  diagnostico: {
    text: "Diagnostico",
    className: "text-[#8B5CF6] bg-[#8B5CF6]/10",
  },
  "aguardando-aprovacao": {
    text: "Aguardando aprovacao",
    className: "text-[#D97706] bg-[#FBBF24]/10",
  },
  confirmado: {
    text: "Confirmado",
    className: "text-[#10B981] bg-[#10B981]/10",
  },
  pendente: {
    text: "Pendente",
    className: "text-[#D97706] bg-[#FBBF24]/10",
  },
  atrasado: {
    text: "Atrasado",
    className: "text-[#EF4444] bg-[#EF4444]/10",
  },
};

export type { StatusVariant };

interface StatusBadgeProps {
  variant: StatusVariant;
  className?: string;
}

export default function StatusBadge({ variant, className = "" }: StatusBadgeProps) {
  const config = variants[variant];
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap ${config.className} ${className}`}
    >
      {config.text}
    </span>
  );
}
