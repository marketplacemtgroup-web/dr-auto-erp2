import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const sizeClass = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
} as const;

interface FormDrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  error?: string | null;
  size?: keyof typeof sizeClass;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  loading?: boolean;
  children: React.ReactNode;
}

export function FormField({
  label,
  children,
  className = "",
  labelClassName = "block text-xs font-medium text-[#64748B] mb-1",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <div className={className}>
      <label className={labelClassName}>{label}</label>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:border-[#0E7490] focus:ring-1 focus:ring-[#0E7490]";

/** Campo numérico sem setas de subir/descer — digitação livre. */
export const plainNumberInputClass =
  `${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;

export const itemFieldLabelClass = "block text-sm font-medium text-[#0F172A] mb-1.5";

export const selectClass = inputClass;

export default function FormDrawer({
  open,
  title,
  subtitle,
  error,
  size = "md",
  onClose,
  onSubmit,
  submitLabel = "Salvar",
  loading,
  children,
}: FormDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative w-full ${sizeClass[size]} max-h-[min(92vh,880px)] flex flex-col bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-drawer-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] shrink-0">
          <div className="min-w-0">
            <h2 id="form-drawer-title" className="text-[16px] font-semibold text-[#1E293B]">
              {title}
            </h2>
            {subtitle ? (
              <p className="text-[12px] text-[#64748B] mt-0.5 leading-snug">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white text-[#64748B] shrink-0"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-3">{children}</div>
          <div className="px-5 py-3.5 border-t border-[#E2E8F0] bg-[#FAFAFA] shrink-0 space-y-2.5">
            {error ? (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            ) : null}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-10 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-10 rounded-lg bg-[#0F3D4C] hover:bg-[#0E7490] text-white text-sm font-medium disabled:opacity-60"
              >
                {loading ? "Salvando..." : submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
