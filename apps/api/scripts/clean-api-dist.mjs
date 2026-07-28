/**
 * Limpa dist + tsbuildinfo antes do nest build.
 * Sem isso, incremental + tsbuildinfo commitado faz o tsc sair 0 sem emitir
 * arquivos na Vercel (dist/ está no .gitignore).
 */
import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
  join(apiRoot, 'dist'),
  join(apiRoot, 'tsconfig.tsbuildinfo'),
  join(apiRoot, 'api', 'nest-dist'),
];

for (const target of targets) {
  if (!existsSync(target)) continue;
  rmSync(target, { recursive: true, force: true });
  console.log(`[clean-api-dist] removed ${target}`);
}
