/** Normaliza DATABASE_URL / DIRECT_URL (aspas na Vercel). */
export function stripEnvQuotes(value: string): string {
  let v = value.trim();
  for (let i = 0; i < 3; i++) {
    const next = v.replace(/^["'`""''\u201c\u201d\u2018\u2019]+|["'`""''\u201c\u201d\u2018\u2019]+$/g, '');
    if (next === v) break;
    v = next;
  }
  return v;
}

export function normalizeDatabaseEnv(): void {
  for (const name of ['DATABASE_URL', 'DIRECT_URL'] as const) {
    const raw = process.env[name]?.trim();
    if (!raw) continue;
    process.env[name] = stripEnvQuotes(raw);
  }
}
