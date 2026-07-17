/**
 * Copia dependências do monorepo para apps/api/node_modules
 * para o bundle serverless da Vercel incluir Prisma + workspaces.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const apiRoot = join(scriptDir, '..');
const repoRoot = join(apiRoot, '../..');
const apiNodeModules = join(apiRoot, 'node_modules');
const rootNodeModules = join(repoRoot, 'node_modules');

function copyIntoApi(relativeDest, sourcePath) {
  if (!existsSync(sourcePath)) {
    console.warn(`[prepare-api-vercel] skip (missing): ${sourcePath}`);
    return;
  }
  const dest = join(apiNodeModules, relativeDest);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(sourcePath, dest, { recursive: true });
  console.log(`[prepare-api-vercel] copied ${sourcePath} -> ${dest}`);
}

mkdirSync(apiNodeModules, { recursive: true });

copyIntoApi('@autocore/database', join(repoRoot, 'packages/database'));
copyIntoApi('@autocore/types', join(repoRoot, 'packages/types'));
copyIntoApi('@prisma/client', join(rootNodeModules, '@prisma/client'));
copyIntoApi('.prisma', join(rootNodeModules, '.prisma'));

console.log('[prepare-api-vercel] done');
