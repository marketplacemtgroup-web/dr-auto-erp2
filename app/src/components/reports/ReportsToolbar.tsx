import { Bookmark, Download, FileText, Monitor, Printer, Star } from "lucide-react";
import { useState } from "react";
import type { ReportPeriodState } from "../../lib/reportPeriod";
import { formatPeriodLabel } from "../../lib/reportPeriod";
import {
  deleteReportFilter,
  getSavedFilters,
  saveReportFilter,
  type SavedReportFilter,
} from "../../lib/reportsBiPrefs";
import { exportAllReports, exportReportCsv, REPORT_EXPORTS } from "../../lib/reportExports";
import { printDocument } from "../../lib/print";

type Props = {
  token: string | null;
  period: ReportPeriodState;
  exportingAll: boolean;
  onExportingAllChange: (v: boolean) => void;
  onApplyPeriod: (p: ReportPeriodState) => void;
  onTvMode: () => void;
  disabled?: boolean;
};

export default function ReportsToolbar({
  token,
  period,
  exportingAll,
  onExportingAllChange,
  onApplyPeriod,
  onTvMode,
  disabled,
}: Props) {
  const [saved, setSaved] = useState<SavedReportFilter[]>(getSavedFilters);
  const [saveName, setSaveName] = useState("");

  function refreshSaved() {
    setSaved(getSavedFilters());
  }

  function handleSaveFilter() {
    const name = saveName.trim() || `Periodo ${formatPeriodLabel(period.from, period.to)}`;
    saveReportFilter(name, period);
    setSaveName("");
    refreshSaved();
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        type="button"
        disabled={!token || exportingAll || disabled}
        onClick={async () => {
          if (!token) return;
          onExportingAllChange(true);
          try {
            await exportAllReports(token, {
              from: period.from,
              to: period.to,
              compare: period.compare,
            });
          } finally {
            onExportingAllChange(false);
          }
        }}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#0F3D4C] text-white text-[12px] font-medium disabled:opacity-60"
      >
        <Download size={14} />
        {exportingAll ? "Exportando..." : "Exportar tudo"}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => printDocument("reports")}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] text-[#0E7490] hover:bg-[#F0FDFA] disabled:opacity-60"
      >
        <Printer size={14} />
        PDF / Imprimir
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onTvMode}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-60"
      >
        <Monitor size={14} />
        Modo TV
      </button>
      <details className="relative">
        <summary className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] text-[#64748B] cursor-pointer list-none">
          <FileText size={14} />
          Exportar item
        </summary>
        <div className="absolute z-20 mt-1 w-56 max-h-64 overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white shadow-lg p-1">
          {REPORT_EXPORTS.map((e) => (
            <button
              key={e.type}
              type="button"
              disabled={!token}
              onClick={() =>
                token &&
                void exportReportCsv(token, e.type, e.file, {
                  from: period.from,
                  to: period.to,
                })
              }
              className="w-full text-left px-2.5 py-1.5 rounded text-[12px] text-[#64748B] hover:bg-[#F8FAFC]"
            >
              {e.label}
            </button>
          ))}
        </div>
      </details>
      <details className="relative">
        <summary className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#E2E8F0] text-[12px] text-[#64748B] cursor-pointer list-none">
          <Bookmark size={14} />
          Filtros salvos
        </summary>
        <div className="absolute z-20 mt-1 w-72 rounded-lg border border-[#E2E8F0] bg-white shadow-lg p-3 space-y-2">
          <div className="flex gap-2">
            <input
              className="flex-1 h-8 px-2 rounded border border-[#E2E8F0] text-[12px]"
              placeholder="Nome do filtro..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
            />
            <button
              type="button"
              onClick={handleSaveFilter}
              className="h-8 px-2 rounded bg-[#0E7490] text-white text-[11px]"
            >
              <Star size={14} />
            </button>
          </div>
          {saved.length === 0 ? (
            <p className="text-[11px] text-[#94A3B8]">Nenhum filtro salvo.</p>
          ) : (
            <ul className="max-h-40 overflow-y-auto space-y-1">
              {saved.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 text-[12px]">
                  <button
                    type="button"
                    className="text-left text-[#0E7490] hover:underline truncate"
                    onClick={() => onApplyPeriod(f.period)}
                  >
                    {f.name}
                  </button>
                  <button
                    type="button"
                    className="text-[#94A3B8] hover:text-[#DC2626] shrink-0"
                    onClick={() => {
                      deleteReportFilter(f.id);
                      refreshSaved();
                    }}
                  >
                    x
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
}
