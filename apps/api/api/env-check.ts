import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyEdgeCors } from './cors';

function checkDatabaseUrl(name: string): string[] {
  const raw = process.env[name]?.trim() ?? '';
  const issues: string[] = [];
  if (!raw) {
    issues.push(`${name} não definida na Vercel`);
    return issues;
  }
  if (raw.startsWith('"') || raw.endsWith('"')) {
    issues.push(`${name} não deve ter aspas na Vercel`);
  }
  if (!/^postgres(ql)?:\/\//i.test(raw.replace(/^"+|"+$/g, ''))) {
    issues.push(`${name} deve começar com postgresql:// (senha com @ precisa ser %40)`);
    return issues;
  }
  try {
    const normalized = raw.replace(/^"+|"+$/g, '');
    const parsed = new URL(normalized);
    if (!parsed.hostname) issues.push(`${name} hostname inválido`);
    if (normalized.includes('@') && normalized.indexOf('@') !== normalized.lastIndexOf('@')) {
      const atCount = (normalized.match(/@/g) ?? []).length;
      if (atCount > 1) {
        issues.push(`${name}: senha provavelmente contém @ sem encode (%40)`);
      }
    }
  } catch {
    issues.push(`${name} não é uma URL válida`);
  }
  return issues;
}

/** Diagnóstico de env — não carrega Prisma/Nest. */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (applyEdgeCors(req, res)) return;

  const issues = [
    ...checkDatabaseUrl('DATABASE_URL'),
    ...checkDatabaseUrl('DIRECT_URL'),
  ];
  if (!process.env.JWT_SECRET?.trim()) issues.push('JWT_SECRET não definida');
  if (!process.env.SUPABASE_URL?.trim()) issues.push('SUPABASE_URL não definida');

  res.status(issues.length ? 503 : 200).json({
    ok: issues.length === 0,
    issues,
    nodeEnv: process.env.NODE_ENV ?? null,
  });
}
