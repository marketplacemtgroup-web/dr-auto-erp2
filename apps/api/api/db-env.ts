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

/**
 * Prisma em serverless: 1 conexão por isolate evita estourar o pooler Supabase
 * com N lambdas. Com limit=1, requests concorrentes precisam esperar — por isso
 * pool_timeout generoso (sem isso → P2024 em 10s no cold start).
 */
function withServerlessPoolParams(url: string): string {
  if (!/^postgres(ql)?:\/\//i.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', '1');
    }
    // Sempre reforça timeout: cold start + bootstrap + GETs concorrentes.
    parsed.searchParams.set('pool_timeout', '30');
    return parsed.toString();
  } catch {
    let next = url;
    if (!/[?&]connection_limit=/i.test(next)) {
      next = next.includes('?') ? `${next}&connection_limit=1` : `${next}?connection_limit=1`;
    }
    if (/[?&]pool_timeout=/i.test(next)) {
      next = next.replace(/([?&]pool_timeout=)[^&]*/i, '$130');
    } else {
      next = `${next}&pool_timeout=30`;
    }
    return next;
  }
}

export function normalizeDatabaseEnv(): void {
  for (const name of ['DATABASE_URL', 'DIRECT_URL'] as const) {
    const raw = process.env[name]?.trim();
    if (!raw) continue;
    let value = stripEnvQuotes(raw);
    // Pooler (DATABASE_URL) é o caminho quente de todos os GETs — limitar por isolate.
    if (name === 'DATABASE_URL') {
      value = withServerlessPoolParams(value);
    }
    process.env[name] = value;
  }
}
