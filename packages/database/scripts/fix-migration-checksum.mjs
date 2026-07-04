/**
 * Atualiza checksum de migration no _prisma_migrations após alinhar SQL ao banco.
 * Uso: node scripts/fix-migration-checksum.mjs 20260625120000_dashboard_cache
 */
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const migrationName = process.argv[2];
if (!migrationName) {
  console.error('Informe o nome da migration, ex: 20260625120000_dashboard_cache');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sqlPath = join(root, 'prisma', 'migrations', migrationName, 'migration.sql');
const content = readFileSync(sqlPath);
const checksum = createHash('sha256').update(content).digest('hex');

const prisma = new PrismaClient();
try {
  const updated = await prisma.$executeRaw`
    UPDATE "_prisma_migrations"
    SET "checksum" = ${checksum}
    WHERE "migration_name" = ${migrationName}
  `;
  console.log(`Checksum atualizado para ${migrationName}: ${checksum} (rows: ${updated})`);
} finally {
  await prisma.$disconnect();
}
