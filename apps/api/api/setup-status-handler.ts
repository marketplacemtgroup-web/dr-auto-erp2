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
      dbReady: true,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[setup-status]', detail);

    const schemaMissing =
      /does not exist/i.test(detail) ||
      /relation .* does not exist/i.test(detail) ||
      /table .* does not exist/i.test(detail);

    const hint = schemaMissing
      ? 'Remova aspas de DATABASE_URL e DIRECT_URL na Vercel (projeto API). Valor = postgresql://... sem " no início/fim. Redeploy. Se o banco for novo: npm run db:deploy no PC.'
      : 'Na Vercel (API): DATABASE_URL = pooler :6543?pgbouncer=true, DIRECT_URL = :5432, senha com @ → %40, sem aspas.';

    const payload = {
      hasOrganization: false,
      singleTenant,
      organizationCount: 0,
      dbReady: false,
      error: schemaMissing
        ? 'Banco conectado, mas tabelas não existem (schema não aplicado ou URL errada)'
        : 'Não foi possível conectar ao banco',
      detail: detail.slice(0, 300),
      hint,
    };

    // 200 evita que o ERP trate como falha genérica; dbReady=false bloqueia cadastro até corrigir.
    res.status(schemaMissing ? 200 : 503).json(payload);
  }
}
