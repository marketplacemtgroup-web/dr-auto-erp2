import { useState } from "react";
import { getMonthlyGoal, setMonthlyGoal } from "../../lib/reportsBiPrefs";
import { formatMoney } from "../../lib/format";
import { inputClass } from "../modules/FormDrawer";

type Props = {
  currentRevenue: number;
};

export default function ReportGoalCard({ currentRevenue }: Props) {
  const [goal, setGoal] = useState(getMonthlyGoal);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(goal || ""));

  const pct = goal > 0 ? Math.min(100, Math.round((currentRevenue / goal) * 100)) : 0;

  function save() {
    const value = Number(draft.replace(",", ".")) || 0;
    setMonthlyGoal(value);
    setGoal(value);
    setEditing(false);
  }

  return (
    <div className="h-full flex flex-col justify-center">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[12px] font-medium text-[#64748B]">Meta do mes</p>
        <button
          type="button"
          onClick={() => {
            setDraft(String(goal || ""));
            setEditing((v) => !v);
          }}
          className="text-[11px] text-[#0E7490]"
        >
          {editing ? "Cancelar" : "Editar"}
        </button>
      </div>
      {editing ? (
        <div className="flex gap-2">
          <input
            className={inputClass}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ex: 50000"
          />
          <button
            type="button"
            onClick={save}
            className="h-9 px-3 rounded-lg bg-[#0E7490] text-white text-[12px] shrink-0"
          >
            Salvar
          </button>
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-[#1E293B]">{goal > 0 ? `${pct}%` : "—"}</p>
          <p className="text-[11px] text-[#94A3B8] mt-1">
            {formatMoney(currentRevenue)}
            {goal > 0 ? ` de ${formatMoney(goal)}` : " — defina uma meta"}
          </p>
          <div className="mt-3 h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0E7490] to-[#16A34A] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
