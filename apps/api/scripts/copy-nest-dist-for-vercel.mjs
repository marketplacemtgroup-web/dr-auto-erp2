/**
 * Copia o build Nest (dist/) para nest-runtime/ (fora de api/) para o bundle
 * serverless incluir o bootstrap sem a Vercel tratar cada .js como function.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const apiRoot = join(scriptDir, '..');
const distDir = join(apiRoot, 'dist');
const nestRuntimeDir = join(apiRoot, 'nest-runtime');
const legacyNestDist = join(apiRoot, 'api', 'nest-dist');
const bootstrapJs = join(distDir, 'bootstrap.js');

if (!existsSync(bootstrapJs)) {
  const listing = existsSync(distDir)
    ? readdirSync(distDir).slice(0, 30).join(', ')
    : '(dist ausente)';
  console.error(`[copy-nest-dist] missing ${bootstrapJs}`);
  console.error(`[copy-nest-dist] dist listing: ${listing}`);
  process.exit(1);
}

rmSync(nestRuntimeDir, { recursive: true, force: true });
rmSync(legacyNestDist, { recursive: true, force: true });
mkdirSync(nestRuntimeDir, { recursive: true });
cpSync(distDir, nestRuntimeDir, { recursive: true });
writeFileSync(
  join(nestRuntimeDir, '.vercel-include'),
  `copied from dist at ${new Date().toISOString()}\n`,
  'utf8',
);
console.log(`[copy-nest-dist] ${distDir} -> ${nestRuntimeDir}`);
