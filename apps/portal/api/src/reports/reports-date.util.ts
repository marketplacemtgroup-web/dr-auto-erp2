export type DateRange = { from: Date; to: Date };

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseLocalDateString(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function parseReportRange(fromStr?: string, toStr?: string): DateRange {
  const today = startOfDay(new Date());
  const from = fromStr
    ? startOfDay(parseLocalDateString(fromStr))
    : new Date(today.getFullYear(), today.getMonth(), 1);
  const to = toStr ? endOfDay(parseLocalDateString(toStr)) : endOfDay(today);
  return { from, to };
}

export function previousReportRange(range: DateRange): DateRange {
  const lengthMs = range.to.getTime() - range.from.getTime();
  const to = endOfDay(new Date(range.from.getTime() - 1));
  const from = startOfDay(new Date(to.getTime() - lengthMs));
  return { from, to };
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export type FinancialPeriodPreset = 'day' | 'week' | 'month' | 'year';

export function resolveFinancialPeriod(preset: FinancialPeriodPreset): DateRange {
  const today = startOfDay(new Date());
  const to = endOfDay(today);

  if (preset === 'day') {
    return { from: today, to };
  }
  if (preset === 'week') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: startOfDay(from), to };
  }
  if (preset === 'year') {
    const from = new Date(today.getFullYear(), 0, 1);
    return { from: startOfDay(from), to };
  }
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: startOfDay(from), to };
}

export function toLocalIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
