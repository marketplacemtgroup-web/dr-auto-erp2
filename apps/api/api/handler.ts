import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyEdgeCors } from './cors';
import { normalizeDatabaseEnv, stripEnvQuotes } from './db-env';
import { handleSetupStatus } from './setup-status-handler';

function validateDbEnv(): string[] {
  const issues: string[] = [];
  for (const name of ['DATABASE_URL', 'DIRECT_URL'] as const) {
    const raw = process.env[name]?.trim() ?? '';
    if (!raw) {
      issues.push(`${name} ausente`);
      continue;
    }
    const value = stripEnvQuotes(raw);
    if (!/^postgres(ql)?:\/\//i.test(value)) {
      issues.push(`${name} inválida (use postgresql://; @ na senha → %40)`);
    }
  }
  return issues;
}

let cachedHandler: ((req: VercelRequest, res: VercelResponse) => void) | null = null;

export default async function vercelHandler(req: VercelRequest, res: VercelResponse) {
  normalizeDatabaseEnv();
  if (applyEdgeCors(req, res)) return;

  const path = (req.url ?? '').split('?')[0] ?? '';
  if (path === '/api/ping' || path.endsWith('/ping')) {
    res.status(200).json({ ok: true, ts: Date.now() });
    return;
  }

  if (path === '/api/setup-status' || path === '/api/auth/setup-status') {
    await handleSetupStatus(res);
    return;
  }

  const dbIssues = validateDbEnv();
  if (dbIssues.length) {
    res.status(503).json({
      message: 'Configuração do banco inválida na Vercel',
      issues: dbIssues,
      hint: 'Veja /api/env-check e docs/DEPLOY-VERCEL.md',
    });
    return;
  }

  try {
    if (!cachedHandler) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getExpressApp } = require('../dist/bootstrap.js') as typeof import('../dist/bootstrap.js');
      cachedHandler = await getExpressApp();
    }
    return cachedHandler(req, res);
  } catch (err) {
    console.error('[api] handler error:', err);
    if (!res.headersSent) {
      const detail = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        message: 'Erro interno na API',
        hint: 'Abra /api/env-check na API e confira DATABASE_URL, DIRECT_URL e JWT_SECRET',
        detail: detail.slice(0, 200),
      });
    }
  }
}
