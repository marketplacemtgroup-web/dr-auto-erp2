const BRAZIL_TZ = "America/Sao_Paulo";

function getBrazilHourMinute(date: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BRAZIL_TZ,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { hour, minute };
}

/**
 * Saudação por horário de Brasília (24h):
 * 06:00–12:00 Bom dia | 12:01–18:00 Boa tarde | 18:01–00:00 Boa noite | 00:01–05:59 Boa madrugada
 */
export function timeGreeting(date = new Date()): string {
  const { hour, minute } = getBrazilHourMinute(date);
  const totalMinutes = hour * 60 + minute;

  if (totalMinutes >= 1 && totalMinutes < 6 * 60) return "Boa madrugada";
  if (totalMinutes >= 6 * 60 && totalMinutes <= 12 * 60) return "Bom dia";
  if (totalMinutes > 12 * 60 && totalMinutes <= 18 * 60) return "Boa tarde";
  return "Boa noite";
}
