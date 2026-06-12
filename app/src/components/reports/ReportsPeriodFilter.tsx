import { useEffect, useState } from "react";
import type { ReportPeriodPreset, ReportPeriodState } from "../../lib/reportPeriod";
import {
  formatPeriodLabel,
  isValidPeriodRange,
  resolveReportPeriod,
} from "../../lib/reportPeriod";
import { inputClass } from "../modules/FormDrawer";

const PRESETS: Array<{ id: ReportPeriodPreset; label: string }> = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
  { id: "lastMonth", label: "Mes anterior" },
  { id: "custom", label: "Personalizado" },
];

type Props = {
  applied: ReportPeriodState;
  loading?: boolean;
  onApply: (next: ReportPeriodState) => void;
};

export default function ReportsPeriodFilter({ applied, loading, onApply }: Props) {
  const [draft, setDraft] = useState<ReportPeriodState>(applied);

  useEffect(() => {
    setDraft(applied);
  }, [applied]);

  function applyPreset(preset: ReportPeriodPreset) {
    if (preset === "custom") {
      setDraft((prev) => ({ ...prev, preset: "custom" }));
      return;
    }
    const range = resolveReportPeriod(preset);
    const next = { ...draft, preset, ...range };
    setDraft(next);
    onApply(next);
  }

  function applyCustom() {
    if (!isValidPeriodRange(draft.from, draft.to)) return;
    onApply({ ...draft, preset: "custom" });
  }

  function setCompare(compare: boolean) {
    const next = { ...draft, compare };
    setDraft(next);
    if (draft.preset !== "custom") {
      onApply(next);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-medium text-[#64748B] mr-1">Periodo:</span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={loading}
            onClick={() => applyPreset(p.id)}
            className={`h-8 px-3 rounded-lg text-[12px] font-medium border transition-colors disabled:opacity-60 ${
              applied.preset === p.id
                ? "border-[#0E7490] bg-[#ECFEFF] text-[#0E7490]"
                : "border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]"
            }`}
          >
            {p.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-[12px] text-[#64748B] cursor-pointer">
          <input
            type="checkbox"
            checked={draft.compare}
            disabled={loading}
            onChange={(e) => setCompare(e.target.checked)}
          />
          Comparar periodo anterior
        </label>
      </div>

      {draft.preset === "custom" ? (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] text-[#64748B] mb-1">De</label>
            <input
              type="date"
              className={inputClass}
              value={draft.from}
              disabled={loading}
              onChange={(e) => setDraft((prev) => ({ ...prev, from: e.target.value, preset: "custom" }))}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#64748B] mb-1">Ate</label>
            <input
              type="date"
              className={inputClass}
              value={draft.to}
              disabled={loading}
              onChange={(e) => setDraft((prev) => ({ ...prev, to: e.target.value, preset: "custom" }))}
            />
          </div>
          <button
            type="button"
            disabled={loading || !isValidPeriodRange(draft.from, draft.to)}
            onClick={applyCustom}
            className="h-9 px-4 rounded-lg bg-[#0E7490] text-white text-[12px] font-medium disabled:opacity-50"
          >
            Aplicar periodo
          </button>
        </div>
      ) : (
        <p className="text-[12px] text-[#94A3B8]">
          Exibindo:{" "}
          <strong className="text-[#64748B]">{formatPeriodLabel(applied.from, applied.to)}</strong>
          {loading ? <span className="ml-2 text-[#0E7490]">Atualizando...</span> : null}
        </p>
      )}
    </div>
  );
}
