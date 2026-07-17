import type { VercelRequest, VercelResponse } from '@vercel/node';

function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function isOriginAllowed(origin: string): boolean {
  const normalized = origin.replace(/\/$/, '');
  if (allowedOrigins().includes(normalized)) return true;

  try {
    const host = new URL(origin).hostname;
    if (host.endsWith('.vercel.app')) return true;
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** CORS na borda (Vercel). Retorna true se respondeu OPTIONS. */
export function applyEdgeCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin as string | undefined;

  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers']?.toString() ??
      'Content-Type, Authorization, Accept',
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
