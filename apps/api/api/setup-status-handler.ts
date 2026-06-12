import type { VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { normalizeDatabaseEnv } from './db-env';

let prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prisma) {
    normalizeDatabaseEnv();
    prisma = new PrismaClient();
  }
  return prisma;
}

/** Verifica se já existe oficina (cadastro inicial). Não usa NestJS. */
export async function handleSetupStatus(res: VercelResponse): Promise<void> {
  const singleTenant = (process.env.SINGLE_TENANT ?? 'true') === 'true';

  try {
    const count = await getPrisma().organization.count();
    res.status(200).json({
      hasOrganization: count > 0,
      singleTenant,
      organizationCount: count,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[setup-status]', detail);
    res.status(503).json({
      hasOrganization: false,
      singleTenant,
      error: 'Não foi possível conectar ao banco',
      detail: detail.slice(0, 300),
      hint:
        'Na Vercel (API): DATABASE_URL = pooler :6543?pgbouncer=true, DIRECT_URL = :5432, senha com @ → %40, sem aspas. Mesmo projeto Supabase do npm run db:deploy local.',
    });
  }
}
