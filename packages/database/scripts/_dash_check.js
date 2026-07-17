const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const p = new PrismaClient();
const TEMP = "ScaliburTemp!2026";

async function main() {
  const user = await p.user.findUnique({ where: { email: "admin@oficinascalibur.local" } });
  const oldHash = user.passwordHash;
  await p.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(TEMP, 10) },
  });

  try {
    const loginRes = await fetch("https://dr-auto-erp2-api.vercel.app/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@oficinascalibur.local", password: TEMP }),
    });
    const loginBody = await loginRes.json();
    console.log("prod orgId", loginBody.organizationId);
    console.log("local orgId", (await p.organization.findFirst({ select: { id: true } })).id);
    console.log("same DB?", loginBody.organizationId === (await p.organization.findFirst()).id);

    // decode jwt payload (no verify)
    const token = loginBody.accessToken;
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    console.log("jwt payload", payload);

    // Hit a raw debug if any; else try reports endpoint
    for (const path of [
      "/api/reports/profit?from=2026-07-01&to=2026-07-16",
      "/api/financial/summary",
      "/api/dashboard/kpis/financial",
    ]) {
      const r = await fetch(`https://dr-auto-erp2-api.vercel.app${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const t = await r.text();
      console.log(path, r.status, t.slice(0, 500));
    }
  } finally {
    await p.user.update({ where: { id: user.id }, data: { passwordHash: oldHash } });
    console.log("RESTORED");
  }
}

main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>p.$disconnect());
