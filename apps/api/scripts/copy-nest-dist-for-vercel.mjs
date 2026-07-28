/**
 * Copia o build Nest (dist/) para api/nest-dist/ para o bundle serverless
 * da Vercel incluir o bootstrap via require local (NFT + includeFiles).
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const apiRoot = join(scriptDir, '..');
const distDir = join(apiRoot, 'dist');
const nestDistDir = join(apiRoot, 'api', 'nest-dist');
const bootstrapJs = join(distDir, 'bootstrap.js');

if (!existsSync(bootstrapJs)) {
  const listing = existsSync(distDir)
    ? readdirSync(distDir).slice(0, 30).join(', ')
    : '(dist ausente)';
  console.error(`[copy-nest-dist] missing ${bootstrapJs}`);
  console.error(`[copy-nest-dist] dist listing: ${listing}`);
  process.exit(1);
}

rmSync(nestDistDir, { recursive: true, force: true });
mkdirSync(dirname(nestDistDir), { recursive: true });
cpSync(distDir, nestDistDir, { recursive: true });
writeFileSync(
  join(nestDistDir, '.vercel-include'),
  `copied from dist at ${new Date().toISOString()}\n`,
  'utf8',
);
console.log(`[copy-nest-dist] ${distDir} -> ${nestDistDir}`);
