import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { applyEdgeCors } from './cors';
import { normalizeDatabaseEnv, stripEnvQuotes } from './db-env';

const REQUIRED_BUCKETS = ['os-media', 'vehicle-photos', 'documents'] as const;

function checkDatabaseUrl(name: string): string[] {
  const raw = process.env[name]?.trim() ?? '';
  const issues: string[] = [];
  if (!raw) {
    issues.push(`${name} não definida na Vercel`);
    return issues;
  }
  if (raw !== stripEnvQuotes(raw)) {
    issues.push(`${name} não deve ter aspas na Vercel — cole só postgresql://... sem " no início/fim`);
  }
  if (!/^postgres(ql)?:\/\//i.test(stripEnvQuotes(raw))) {
    issues.push(`${name} deve começar com postgresql:// (senha com @ precisa ser %40)`);
    return issues;
  }
  try {
    const normalized = stripEnvQuotes(raw);
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

async function checkDatabaseConnection(): Promise<string[]> {
  const issues: string[] = [];
  if (!process.env.DATABASE_URL?.trim()) return issues;
  try {
    normalizeDatabaseEnv();
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    try {
      await prisma.organization.count();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/does not exist/i.test(msg)) {
        issues.push(
          'Tabela organizations não existe — remova aspas de DATABASE_URL/DIRECT_URL na Vercel, confira o mesmo projeto Supabase do .env local e rode npm run db:deploy no PC.',
        );
      } else {
        issues.push(`Schema incompleto: ${msg.slice(0, 120)}`);
      }
    }
    await prisma.$disconnect();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    issues.push(
      `Banco inacessível na Vercel: ${msg.slice(0, 180)}. Use DATABASE_URL pooler :6543?pgbouncer=true (senha @ → %40).`,
    );
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

  const dbIssues = [
    ...checkDatabaseUrl('DATABASE_URL'),
    ...checkDatabaseUrl('DIRECT_URL'),
  ];
  const issues = [...dbIssues];
  if (!process.env.JWT_SECRET?.trim()) issues.push('JWT_SECRET não definida');

  issues.push(...checkPushEnv());

  if (dbIssues.length === 0) {
    issues.push(...(await checkDatabaseConnection()));
  }

  if (dbIssues.length === 0 && !issues.some((i) => i.startsWith('Banco inacessível'))) {
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
    push: {
      firebaseFcm: isFirebaseConfigured(),
      webPush: !!(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim()),
    },
  });
}

function isFirebaseConfigured(): boolean {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (raw) {
    try {
      JSON.parse(raw.replace(/^"+|"+$/g, ''));
      return true;
    } catch {
      return false;
    }
  }
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();
  if (!b64) return false;
  try {
    JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    return true;
  } catch {
    return false;
  }
}

function checkPushEnv(): string[] {
  if (isFirebaseConfigured()) return [];
  return [
    'FIREBASE_SERVICE_ACCOUNT não configurado — push Android (FCM) desativado. Rode: node scripts/setup-firebase-fcm.mjs',
  ];
}
