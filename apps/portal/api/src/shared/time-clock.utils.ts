export function parseTimeOnDate(dateStr: string, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCHours(h, m ?? 0, 0, 0);
  return d;
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function computeWorkedMinutes(
  clockIn: Date | null,
  breakStart: Date | null,
  breakEnd: Date | null,
  clockOut: Date | null,
): number {
  if (!clockIn) return 0;
  const end = clockOut ?? new Date();
  let total = minutesBetween(clockIn, end);
  if (breakStart && breakEnd) {
    total -= minutesBetween(breakStart, breakEnd);
  } else if (breakStart && !breakEnd) {
    total -= minutesBetween(breakStart, end);
  }
  return Math.max(0, total);
}

export function computeExpectedMinutes(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  breakStart: string | null | undefined,
  breakEnd: string | null | undefined,
  dateStr: string,
): number {
  if (!startTime || !endTime) return 0;
  const start = parseTimeOnDate(dateStr, startTime);
  const end = parseTimeOnDate(dateStr, endTime);
  let total = minutesBetween(start, end);
  if (breakStart && breakEnd) {
    total -= minutesBetween(
      parseTimeOnDate(dateStr, breakStart),
      parseTimeOnDate(dateStr, breakEnd),
    );
  }
  return Math.max(0, total);
}

export function formatTimeHHmm(date: Date | null | undefined): string | null {
  if (!date) return null;
  const h = date.getUTCHours().toString().padStart(2, '0');
  const m = date.getUTCMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function toDateOnlyStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function startOfDayUtc(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function endOfDayUtc(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

export function eachDateInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  while (cur <= last) {
    dates.push(toDateOnlyStr(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

export function dayOfWeekFromDate(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00.000Z`).getUTCDay();
}
