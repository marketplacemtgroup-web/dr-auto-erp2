const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    env[m[1]] = m[2].trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
  }
  return env;
}

async function check(label, url) {
  const p = new PrismaClient({ datasources: { db: { url } } });
  try {
    await p.$executeRawUnsafe(`SET statement_timeout = 0`);
    const cols = await p.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='financial_entries'
        AND column_name IN ('account_id','cost_center_id','amount_paid')
      ORDER BY 1
    `);
    console.log(label, cols);
  } finally {
    await p.$disconnect();
  }
}

async function addViaDirect(url) {
  const p = new PrismaClient({ datasources: { db: { url } } });
  try {
    await p.$executeRawUnsafe(`SET statement_timeout = 0`);
    const stmts = [
      `ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "account_id" TEXT`,
      `ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "cost_center_id" TEXT`,
      `ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "document_type" TEXT`,
      `ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "document_number" TEXT`,
      `ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0`,
      `ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "issue_date" DATE`,
      `ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "notes" TEXT`,
      `ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "attachment_url" TEXT`,
      `ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "reversed_at" TIMESTAMP(3)`,
      `ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "reversed_by_user_id" TEXT`,
      `ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "reversal_reason" TEXT`,
    ];
    for (const s of stmts) {
      console.log("exec:", s.slice(0, 60));
      await p.$executeRawUnsafe(s);
    }
  } finally {
    await p.$disconnect();
  }
}

async function main() {
  const env = loadEnv();
  console.log("DB host DATABASE:", (env.DATABASE_URL.match(/@([^/:]+)/) || [])[1]);
  console.log("DB host DIRECT:", (env.DIRECT_URL.match(/@([^/:]+)/) || [])[1]);
  await check("before DATABASE", env.DATABASE_URL);
  await check("before DIRECT", env.DIRECT_URL);
  await addViaDirect(env.DIRECT_URL);
  await check("after DATABASE", env.DATABASE_URL);
  await check("after DIRECT", env.DIRECT_URL);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
