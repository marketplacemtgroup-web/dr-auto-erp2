export type ReportPeriodPreset = "today" | "week" | "month" | "lastMonth" | "custom";

export type ReportPeriodState = {
  preset: ReportPeriodPreset;
  from: string;
  to: string;
  compare: boolean;
};

/** Data local YYYY-MM-DD (evita bug de fuso com toISOString). */
export function toLocalIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseLocalIsoDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function defaultReportPeriod(): ReportPeriodState {
  const today = startOfDay(new Date());
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    preset: "month",
    from: toLocalIsoDate(from),
    to: toLocalIsoDate(today),
    compare: false,
  };
}

export function resolveReportPeriod(preset: ReportPeriodPreset): Pick<ReportPeriodState, "from" | "to"> {
  const today = startOfDay(new Date());
  if (preset === "today") {
    return { from: toLocalIsoDate(today), to: toLocalIsoDate(today) };
  }
  if (preset === "week") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: toLocalIsoDate(from), to: toLocalIsoDate(today) };
  }
  if (preset === "lastMonth") {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: toLocalIsoDate(from), to: toLocalIsoDate(to) };
  }
  if (preset === "month") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toLocalIsoDate(from), to: toLocalIsoDate(today) };
  }
  return defaultReportPeriod();
}

export function formatPeriodLabel(from: string, to: string) {
  const f = parseLocalIsoDate(from).toLocaleDateString("pt-BR");
  const t = parseLocalIsoDate(to).toLocaleDateString("pt-BR");
  return f === t ? f : `${f} — ${t}`;
}

export function isValidPeriodRange(from: string, to: string) {
  if (!from || !to) return false;
  return parseLocalIsoDate(from).getTime() <= parseLocalIsoDate(to).getTime();
}
