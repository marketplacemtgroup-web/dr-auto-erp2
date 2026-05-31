import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { applyEdgeCors } from './cors';

const REQUIRED_BUCKETS = ['os-media', 'vehicle-photos', 'documents'] as const;

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

async function checkStorageBuckets(): Promise<string[]> {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url) return ['SUPABASE_URL não definida'];
  if (!key) return ['SUPABASE_SERVICE_ROLE_KEY não definida'];

  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.storage.listBuckets();
  if (error) return [`Supabase Storage inacessível: ${error.message}`];

  const ids = new Set((data ?? []).map((b) => b.id));
  return REQUIRED_BUCKETS.filter((id) => !ids.has(id)).map(
    (id) => `Bucket "${id}" não existe — rode scripts/supabase-storage-buckets.sql no Supabase`,
  );
}

/** Diagnóstico de env — não carrega Prisma/Nest. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyEdgeCors(req, res)) return;

  const issues = [
    ...checkDatabaseUrl('DATABASE_URL'),
    ...checkDatabaseUrl('DIRECT_URL'),
  ];
  if (!process.env.JWT_SECRET?.trim()) issues.push('JWT_SECRET não definida');

  if (issues.length === 0) {
    issues.push(...(await checkStorageBuckets()));
  }

  res.status(issues.length ? 503 : 200).json({
    ok: issues.length === 0,
    issues,
    nodeEnv: process.env.NODE_ENV ?? null,
    storage: {
      buckets: [...REQUIRED_BUCKETS],
      directUpload: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  });
}
