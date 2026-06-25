import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import ReportsPeriodFilter from "../../components/reports/ReportsPeriodFilter";
import ReportsToolbar from "../../components/reports/ReportsToolbar";
import PageLoader from "../../components/PageLoader";
import { api, getErrorMessage } from "../../lib/api";
import { normalizeReportsFull } from "../../lib/normalizeReportsFull";
import {
  defaultReportPeriod,
  formatPeriodLabel,
  parseLocalIsoDate,
  type ReportPeriodState,
} from "../../lib/reportPeriod";
import { QUERY_STALE_TIME_MS } from "../../lib/query-cache";
import { useAuthStore } from "../../stores/authStore";

const ReportsDashboard = lazy(() => import("../../components/reports/ReportsDashboard"));
const ReportsPrintSheet = lazy(() => import("../../components/reports/ReportsPrintSheet"));
const ReportsTvMode = lazy(() => import("../../components/reports/ReportsTvMode"));
const PrintPortal = lazy(() => import("../../components/print/PrintPortal"));

export default function ReportsPage() {
  const token = useAuthStore((s) => s.session?.accessToken ?? null);
  const [period, setPeriod] = useState<ReportPeriodState>(defaultReportPeriod);
  const [exportingAll, setExportingAll] = useState(false);
  const [tvMode, setTvMode] = useState(false);

  const queryParams = useMemo(
    () => ({ from: period.from, to: period.to, compare: period.compare }),
    [period],
  );

  const { data: report, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["reports-full", period.from, period.to, period.compare],
    queryFn: async () => {
      const raw = await api.reportsFull(token!, queryParams);
      return normalizeReportsFull(raw);
    },
    enabled: !!token,
    staleTime: QUERY_STALE_TIME_MS,
  });

  const revenueChart = useMemo(
    () =>
      report?.financial.revenueByDay.map((r) => {
        const date =
          typeof r.date === "string"
            ? parseLocalIsoDate(r.date.slice(0, 10))
            : parseLocalIsoDate(new Date(r.date).toISOString().slice(0, 10));
        return {
          label: date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
          value: Number(r.amount),
        };
      }) ?? [],
    [report],
  );

  const periodLabel = formatPeriodLabel(period.from, period.to);
  const errorMessage = isError ? getErrorMessage(error, "Não foi possível carregar os relatórios.") : null;

  return (
    <>
      <ModulePageShell
        title="Relatórios BI"
        description="Dashboard executivo, gráficos interativos e exportação"
      >
        <ReportsPeriodFilter
          applied={period}
          loading={isFetching}
          onApply={setPeriod}
        />

        <ReportsToolbar
          token={token}
          period={period}
          exportingAll={exportingAll}
          onExportingAllChange={setExportingAll}
          onApplyPeriod={setPeriod}
          onTvMode={() => setTvMode(true)}
          disabled={(isLoading && !report) || isError}
        />

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B]">
            <p className="font-medium">Falha ao carregar relatórios</p>
            <p className="mt-1 text-[#B91C1C]">{errorMessage}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 h-8 px-3 rounded-lg bg-[#DC2626] text-white text-[12px] font-medium"
            >
              Tentar novamente
            </button>
          </div>
        ) : null}

        <div
          className={
            isFetching && !isLoading ? "opacity-60 pointer-events-none transition-opacity" : ""
          }
        >
          {report ? (
            <Suspense fallback={<PageLoader />}>
              <ReportsDashboard
                report={report}
                period={period}
                token={token}
                isLoading={isLoading}
              />
            </Suspense>
          ) : isLoading ? (
            <p className="text-sm text-[#94A3B8] py-12 text-center">
              Carregando relatórios… pode levar alguns segundos.
            </p>
          ) : isError ? null : (
            <p className="text-sm text-[#94A3B8] py-12 text-center">Sem dados para o período.</p>
          )}
        </div>
      </ModulePageShell>

      {report ? (
        <Suspense fallback={null}>
          <PrintPortal>
            <ReportsPrintSheet report={report} />
          </PrintPortal>
        </Suspense>
      ) : null}

      {tvMode && report ? (
        <Suspense fallback={<PageLoader />}>
          <ReportsTvMode
            report={report}
            periodLabel={periodLabel}
            revenueChart={revenueChart}
            onClose={() => setTvMode(false)}
            onRefresh={() => void refetch()}
          />
        </Suspense>
      ) : null}
    </>
  );
}
