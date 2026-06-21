/** Compara duas datas ISO ignorando milissegundos. */
export function isoDatesEqual(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return a === b;
  return Math.floor(ta / 60_000) === Math.floor(tb / 60_000);
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Converte valor datetime-local (horário local do navegador) para ISO UTC. */
export function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function splitDatetimeLocal(value: string): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const [date, time = ""] = value.split("T");
  return { date: date ?? "", time: time.slice(0, 5) };
}

export function joinDatetimeLocal(date: string, time: string): string {
  if (!date) return "";
  return `${date}T${time || "09:00"}`;
}

/** Início e fim do dia no fuso local (para filtros de agenda). */
export function localDayRangeIso(day: Date): { from: string; to: string } {
  const from = new Date(day);
  from.setHours(0, 0, 0, 0);
  const to = new Date(day);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function endOfLocalWeek(startMonday: Date): Date {
  const end = new Date(startMonday);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}
