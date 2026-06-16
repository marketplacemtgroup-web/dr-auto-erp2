import { cpSync, existsSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const databasePkg = resolve(__dirname, '..');
const repoRoot = resolve(databasePkg, '../..');
const schema = resolve(databasePkg, 'prisma/schema.prisma');
const sourceClient = resolve(repoRoot, 'node_modules/.prisma/client');

execSync('prisma generate', { cwd: databasePkg, stdio: 'inherit' });

const workspaceTargets = [resolve(repoRoot, 'apps/api/node_modules/.prisma/client')];

for (const target of workspaceTargets) {
  if (!existsSync(resolve(target, '..'))) continue;
  if (!existsSync(sourceClient)) {
    throw new Error(`Prisma client not found at ${sourceClient}`);
  }

  console.log(`[prisma] syncing client -> ${target}`);
  rmSync(target, { recursive: true, force: true });
  cpSync(sourceClient, target, { recursive: true });
}

// Keep schema path visible for manual runs from workspaces.
void schema;
