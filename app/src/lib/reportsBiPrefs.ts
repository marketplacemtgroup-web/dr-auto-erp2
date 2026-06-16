import type { ReportPeriodState } from "./reportPeriod";

const GOAL_KEY = "oficinadobeto-reports-monthly-goal";
const FILTERS_KEY = "oficinadobeto-reports-saved-filters";

export type SavedReportFilter = {
  id: string;
  name: string;
  period: ReportPeriodState;
};

export function getMonthlyGoal(): number {
  try {
    const raw = localStorage.getItem(GOAL_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

export function setMonthlyGoal(value: number) {
  localStorage.setItem(GOAL_KEY, String(Math.max(0, value)));
}

export function getSavedFilters(): SavedReportFilter[] {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    return raw ? (JSON.parse(raw) as SavedReportFilter[]) : [];
  } catch {
    return [];
  }
}

export function saveReportFilter(name: string, period: ReportPeriodState) {
  const list = getSavedFilters().filter((f) => f.name !== name);
  list.unshift({
    id: crypto.randomUUID(),
    name,
    period: { ...period },
  });
  localStorage.setItem(FILTERS_KEY, JSON.stringify(list.slice(0, 12)));
}

export function deleteReportFilter(id: string) {
  const list = getSavedFilters().filter((f) => f.id !== id);
  localStorage.setItem(FILTERS_KEY, JSON.stringify(list));
}
