import { AlertTriangle, X } from "lucide-react";
import { api, type MaintenanceReminderRow } from "../lib/api";
import { routes } from "../lib/routes";
import { useApiQuery } from "../hooks/useApiQuery";
import NavButton from "./NavButton";

const TYPE_LABEL: Record<string, string> = {
  REVISION: "Revisão preventiva",
  OIL_CHANGE: "Troca de óleo",
};

interface MaintenanceAlertModalProps {
  onDismiss: () => void;
}

export default function MaintenanceAlertModal({ onDismiss }: MaintenanceAlertModalProps) {
  const { data } = useApiQuery(["maintenance-month-overdue"], (t) =>
    api.maintenanceMonthOverdue(t),
  );

  const rows = data ?? [];
  if (rows.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="maintenance-alert-title"
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-[#E2E8F0] bg-amber-50">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="maintenance-alert-title" className="text-[16px] font-semibold text-[#1E293B]">
              Manutenções preventivas vencidas por prazo
            </h2>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              {rows.length} veículo(s) com revisão ou troca de óleo pelo prazo em meses.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-2 rounded-lg hover:bg-amber-100 text-[#64748B]"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <ul className="divide-y divide-[#F1F5F9] overflow-y-auto max-h-[50vh]">
          {rows.map((row: MaintenanceReminderRow) => (
            <li key={row.id} className="px-5 py-3">
              <p className="text-sm font-medium text-[#1E293B]">
                {row.vehicle.plate} — {row.vehicle.customer.name}
              </p>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                {TYPE_LABEL[row.type] ?? row.type} · OS #{row.serviceOrder.number}
                {row.dueDate
                  ? ` · venceu em ${new Date(row.dueDate).toLocaleDateString("pt-BR")}`
                  : ""}
              </p>
              <NavButton
                to={routes.ordemDeServicoDetalhe(row.serviceOrder.id)}
                className="text-[12px] text-[#0E7490] hover:underline mt-1 inline-block"
              >
                Abrir OS
              </NavButton>
            </li>
          ))}
        </ul>
        <div className="px-5 py-3 border-t border-[#E2E8F0] flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="h-9 px-4 rounded-lg bg-[#0F3D4C] text-white text-sm font-medium"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
