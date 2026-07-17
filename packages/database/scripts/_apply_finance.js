const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const p = new PrismaClient();

async function execFile(file) {
  const sql = fs.readFileSync(path.join(__dirname, file), "utf8");
  // Split on semicolons that end statements, but keep DO $$ blocks intact
  const parts = [];
  let buf = "";
  let inDo = false;
  for (const line of sql.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DO $$")) inDo = true;
    buf += line + "\n";
    if (inDo && trimmed === "END $$;") {
      parts.push(buf.trim());
      buf = "";
      inDo = false;
    } else if (!inDo && trimmed.endsWith(";") && !trimmed.startsWith("--")) {
      parts.push(buf.trim());
      buf = "";
    }
  }
  if (buf.trim()) parts.push(buf.trim());

  await p.$executeRawUnsafe(`SET statement_timeout = 0`);
  for (const stmt of parts) {
    if (!stmt || stmt.startsWith("--")) continue;
    process.stdout.write(`> ${stmt.slice(0, 70).replace(/\s+/g, " ")}...\n`);
    try {
      await p.$executeRawUnsafe(stmt);
    } catch (e) {
      const msg = e.message || String(e);
      if (/already exists|duplicate/i.test(msg)) {
        console.log("  (skip exists)");
        continue;
      }
      throw e;
    }
  }
}

async function main() {
  await execFile("_fix_part_finance.sql");
  console.log("finance OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
