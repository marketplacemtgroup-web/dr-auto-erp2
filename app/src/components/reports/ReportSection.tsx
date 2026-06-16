import { Download } from "lucide-react";
import type { ReportPeriodState } from "../../lib/reportPeriod";
import { exportReportCsv } from "../../lib/reportExports";

type Props = {
  title: string;
  subtitle?: string;
  className?: string;
  exportType?: string;
  exportFile?: string;
  period: ReportPeriodState;
  token: string | null;
  children: React.ReactNode;
};

export default function ReportSection({
  title,
  subtitle,
  className = "",
  exportType,
  exportFile,
  period,
  token,
  children,
}: Props) {
  return (
    <div className={`bg-white rounded-xl border border-[#E2E8F0] p-5 ${className}`}>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-[14px] font-semibold text-[#1E293B]">{title}</h3>
          {subtitle ? <p className="text-[11px] text-[#94A3B8] mt-0.5">{subtitle}</p> : null}
        </div>
        {exportType && exportFile && token ? (
          <button
            type="button"
            onClick={() =>
              void exportReportCsv(token, exportType, exportFile, {
                from: period.from,
                to: period.to,
              })
            }
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-[11px] text-[#0E7490] hover:bg-[#F0FDFA] shrink-0"
          >
            <Download size={14} />
            CSV
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}
