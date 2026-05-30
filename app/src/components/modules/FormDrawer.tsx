import { X } from "lucide-react";

interface FormDrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
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
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-[#64748B] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] focus:outline-none focus:border-[#0E7490] focus:ring-1 focus:ring-[#0E7490]";

export const selectClass = inputClass;

export default function FormDrawer({
  open,
  title,
  subtitle,
  onClose,
  onSubmit,
  submitLabel = "Salvar",
  loading,
  children,
}: FormDrawerProps) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} aria-hidden />
      <aside className="fixed right-0 top-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#E2E8F0] shrink-0">
          <div>
            <h2 className="text-[16px] font-semibold text-[#1E293B]">{title}</h2>
            {subtitle && (
              <p className="text-[12px] text-[#64748B] mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
          <div className="px-5 py-4 border-t border-[#E2E8F0] flex gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC]"
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
        </form>
      </aside>
    </>
  );
}
