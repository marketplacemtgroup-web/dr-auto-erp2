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

/** Prisma em serverless: 1 conexão por isolate evita esgotar o pool no cold start. */
function withServerlessConnectionLimit(url: string): string {
  if (!/^postgres(ql)?:\/\//i.test(url)) return url;
  if (/[?&]connection_limit=/i.test(url)) return url;
  return url.includes('?') ? `${url}&connection_limit=1` : `${url}?connection_limit=1`;
}

export function normalizeDatabaseEnv(): void {
  for (const name of ['DATABASE_URL', 'DIRECT_URL'] as const) {
    const raw = process.env[name]?.trim();
    if (!raw) continue;
    let value = stripEnvQuotes(raw);
    // Pooler (DATABASE_URL) é o caminho quente de todos os GETs — limitar por isolate.
    if (name === 'DATABASE_URL') {
      value = withServerlessConnectionLimit(value);
    }
    process.env[name] = value;
  }
}
