export type FinancialPeriodPreset = "day" | "week" | "month" | "year";

export const FINANCIAL_PERIOD_PRESETS: Array<{ id: FinancialPeriodPreset; label: string }> = [
  { id: "day", label: "Dia" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
  { id: "year", label: "Ano" },
];

export function financialPeriodLabel(preset: FinancialPeriodPreset) {
  return FINANCIAL_PERIOD_PRESETS.find((p) => p.id === preset)?.label ?? preset;
}

export function formatFinancialPeriodRange(from: string, to: string) {
  const f = new Date(`${from}T12:00:00`).toLocaleDateString("pt-BR");
  const t = new Date(`${to}T12:00:00`).toLocaleDateString("pt-BR");
  return f === t ? f : `${f} — ${t}`;
}
