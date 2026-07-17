import AutoExpandTextarea from "./AutoExpandTextarea";

type CustomerObservationsPanelProps = {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving?: boolean;
  disabled?: boolean;
  title?: string;
  hint?: string;
  placeholder?: string;
  saveLabel?: string;
};

export default function CustomerObservationsPanel({
  value,
  onChange,
  onSave,
  saving = false,
  disabled = false,
  title = "Observações visíveis ao cliente",
  hint = "Este texto aparece em uma aba separada no portal do cliente — não fica misturado com itens ou fotos.",
  placeholder = "Descreva recomendações, cuidados, prazos, detalhes do serviço ou qualquer informação importante para o cliente...",
  saveLabel = "Salvar observações",
}: CustomerObservationsPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden max-w-3xl">
      <div className="px-5 py-4 border-b border-[#F1F5F9] bg-gradient-to-r from-[#ECFEFF] via-white to-[#F0FDF4]">
        <h2 className="text-sm font-semibold text-[#1E293B]">{title}</h2>
        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{hint}</p>
      </div>
      <div className="p-5">
        <AutoExpandTextarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          minRows={6}
          maxRows={28}
        />
        <p className="text-[11px] text-[#94A3B8] mt-2">
          A caixa cresce automaticamente conforme você digita.
        </p>
      </div>
      {!disabled ? (
        <div className="px-5 pb-5 flex justify-end border-t border-[#F1F5F9] pt-4">
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-[#0F3D4C] text-white text-sm font-medium hover:bg-[#0a2d38] disabled:opacity-50"
          >
            {saving ? "Salvando..." : saveLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
