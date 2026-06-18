#!/usr/bin/env node
/**
 * Cria buckets do Supabase Storage exigidos pelo ERP (fotos OS, veículos, docs, branding).
 * Uso: node scripts/ensure-supabase-buckets.mjs
 * Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente ou em apps/api/.env
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

for (const p of [join(root, ".env"), join(root, "apps/api/.env")]) {
  loadEnvFile(p);
}

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (apps/api/.env ou .env na raiz).");
  process.exit(1);
}

const client = createClient(url, key, { auth: { persistSession: false } });

const BUCKETS = [
  { id: "os-media", public: false, fileSizeLimit: 52_428_800 },
  { id: "vehicle-photos", public: false, fileSizeLimit: 10_485_760 },
  { id: "documents", public: false, fileSizeLimit: 10_485_760 },
  { id: "branding", public: true, fileSizeLimit: 5_242_880 },
];

const { data: existing, error: listErr } = await client.storage.listBuckets();
if (listErr) {
  console.error("Não foi possível listar buckets:", listErr.message);
  process.exit(1);
}

const ids = new Set((existing ?? []).map((b) => b.id));
let created = 0;

for (const bucket of BUCKETS) {
  if (ids.has(bucket.id)) {
    console.log(`✓ ${bucket.id} (já existe)`);
    continue;
  }
  const { error } = await client.storage.createBucket(bucket.id, {
    public: bucket.public,
    fileSizeLimit: bucket.fileSizeLimit,
  });
  if (error) {
    console.error(`✗ ${bucket.id}: ${error.message}`);
    process.exit(1);
  }
  console.log(`+ ${bucket.id} criado`);
  created++;
}

console.log(created ? `\n${created} bucket(s) criado(s). Upload de mídia liberado.` : "\nTodos os buckets já existiam.");
