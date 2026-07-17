#!/usr/bin/env node
/**
 * Analisa performance.log (gerado pelo PerformanceInterceptor da API).
 * Uso: node scripts/analyze-performance-log.mjs [caminho-do-log]
 *
 * Baseline Supabase: compare durationMs e queryCount antes/depois das otimizações.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const logPath = process.argv[2] ?? join(process.cwd(), "performance.log");

if (!existsSync(logPath)) {
  console.error(`Arquivo não encontrado: ${logPath}`);
  console.error("Execute a API com tráfego real para gerar performance.log na raiz do projeto.");
  process.exit(1);
}

const lines = readFileSync(logPath, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

const entries = [];
for (const line of lines) {
  try {
    entries.push(JSON.parse(line));
  } catch {
    /* skip malformed */
  }
}

if (entries.length === 0) {
  console.log("Nenhuma entrada válida no log.");
  process.exit(0);
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function stats(values) {
  if (values.length === 0) return { count: 0, avg: 0, p50: 0, p95: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    avg: Math.round(sum / sorted.length),
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
  };
}

const byEndpoint = new Map();
for (const e of entries) {
  const key = `${e.method} ${e.endpoint}`;
  if (!byEndpoint.has(key)) byEndpoint.set(key, []);
  byEndpoint.get(key).push(e);
}

console.log(`\n=== Performance log: ${entries.length} requisições ===\n`);
console.log(
  "endpoint".padEnd(52),
  "n".padStart(5),
  "avg ms".padStart(8),
  "p50".padStart(6),
  "p95".padStart(6),
  "max".padStart(6),
  "avg q".padStart(7),
  "p95 q".padStart(7),
);

const rows = [...byEndpoint.entries()]
  .map(([endpoint, list]) => {
    const durations = list.map((x) => x.durationMs ?? 0);
    const queries = list.map((x) => x.queryCount ?? 0);
    const d = stats(durations);
    const q = stats(queries);
    return { endpoint, d, q };
  })
  .sort((a, b) => b.d.p95 - a.d.p95);

for (const { endpoint, d, q } of rows.slice(0, 40)) {
  console.log(
    endpoint.slice(0, 52).padEnd(52),
    String(d.count).padStart(5),
    String(d.avg).padStart(8),
    String(d.p50).padStart(6),
    String(d.p95).padStart(6),
    String(d.max).padStart(6),
    String(q.avg).padStart(7),
    String(q.p95).padStart(7),
  );
}

const allDuration = stats(entries.map((e) => e.durationMs ?? 0));
const allQueries = stats(entries.map((e) => e.queryCount ?? 0));

console.log("\n--- Totais ---");
console.log(`Duração (ms): avg=${allDuration.avg} p50=${allDuration.p50} p95=${allDuration.p95} max=${allDuration.max}`);
console.log(`Queries:      avg=${allQueries.avg} p50=${allQueries.p50} p95=${allQueries.p95} max=${allQueries.max}`);
console.log("\nCompare estes números com baseline anterior (PERFORMANCE_OPTIMIZATION_REPORT.md).");
console.log("Para Supabase: use também Dashboard → Database → Query Performance / Logs.\n");
