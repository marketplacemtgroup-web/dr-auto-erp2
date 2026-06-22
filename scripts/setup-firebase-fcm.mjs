#!/usr/bin/env node
/**
 * Configura push FCM (Android) para a API OFICINA DO BETO.
 *
 * Uso:
 *   node scripts/setup-firebase-fcm.mjs caminho/para/service-account.json
 *   node scripts/setup-firebase-fcm.mjs --base64 caminho/para/service-account.json
 *
 * Firebase Console → Projeto oficina-do-beto-campinas → Configurações → Contas de serviço
 * → Gerar nova chave privada (JSON).
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const args = process.argv.slice(2).filter((a) => a !== '--');
const base64Only = args.includes('--base64');
const fileArg = args.find((a) => !a.startsWith('--'));

if (!fileArg) {
  console.error(`
Uso: node scripts/setup-firebase-fcm.mjs <service-account.json> [--base64]

1. Abra https://console.firebase.google.com/project/oficina-do-beto-campinas/settings/serviceaccounts/adminsdk
2. "Gerar nova chave privada" e salve o JSON
3. Rode este script com o caminho do arquivo
`);
  process.exit(1);
}

const filePath = resolve(fileArg);
if (!existsSync(filePath)) {
  console.error(`Arquivo não encontrado: ${filePath}`);
  process.exit(1);
}

const raw = readFileSync(filePath, 'utf8').trim();
let parsed;
try {
  parsed = JSON.parse(raw);
} catch {
  console.error('O arquivo não é um JSON válido de conta de serviço Firebase.');
  process.exit(1);
}

const required = ['project_id', 'client_email', 'private_key'];
const missing = required.filter((k) => !parsed[k]);
if (missing.length) {
  console.error(`JSON incompleto. Campos ausentes: ${missing.join(', ')}`);
  process.exit(1);
}

    const val expectedProjectId = 'oficina-do-beto-campinas';
if (parsed.project_id !== expectedProjectId) {
  console.warn(
    `Aviso: project_id é "${parsed.project_id}" (esperado ${expectedProjectId}). Confira se o JSON é do projeto certo.`,
  );
}

const oneLine = JSON.stringify(parsed);
const b64 = Buffer.from(oneLine, 'utf8').toString('base64');

console.log('\n=== Firebase FCM — variáveis para a Vercel (oficina-beto-api) ===\n');
console.log('Opção A — JSON em uma linha (recomendado):\n');
console.log(`FIREBASE_SERVICE_ACCOUNT=${oneLine}\n`);
console.log('Opção B — Base64 (se a Vercel truncar o JSON):\n');
console.log(`FIREBASE_SERVICE_ACCOUNT_BASE64=${b64}\n`);
console.log('Passos na Vercel:');
console.log('  1. https://vercel.com → projeto oficina-beto-api → Settings → Environment Variables');
console.log('  2. Adicione FIREBASE_SERVICE_ACCOUNT (Production + Preview)');
console.log('  3. Redeploy da API');
console.log('  4. Confira: https://oficina-beto-api.vercel.app/api/env-check → push.firebaseFcm: true\n');

if (base64Only) {
  console.log('(--base64) Use apenas FIREBASE_SERVICE_ACCOUNT_BASE64 na Vercel.\n');
}
