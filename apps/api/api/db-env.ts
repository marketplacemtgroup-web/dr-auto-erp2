/** Normaliza DATABASE_URL / DIRECT_URL (aspas na Vercel). */
export function normalizeDatabaseEnv(): void {
  for (const name of ['DATABASE_URL', 'DIRECT_URL'] as const) {
    const raw = process.env[name]?.trim();
    if (!raw) continue;
    process.env[name] = raw.replace(/^"+|"+$/g, '');
  }
}
