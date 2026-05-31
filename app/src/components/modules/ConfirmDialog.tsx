interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Excluir",
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onCancel} aria-hidden />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-full max-w-sm bg-white rounded-xl shadow-2xl p-5">
        <h3 className="text-[16px] font-semibold text-[#1E293B]">{title}</h3>
        <p className="text-sm text-[#64748B] mt-2">{message}</p>
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-10 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Aguarde..." : confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
