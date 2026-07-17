const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  // Simulate what dashboard summary does
  const orgs = await p.organization.findMany({ take: 1, select: { id: true, name: true } });
  console.log("orgs:", orgs);
  if (!orgs[0]) {
    console.log("NO ORG");
    return;
  }
  const organizationId = orgs[0].id;

  // check dashboard_cache columns
  const cols = await p.$queryRawUnsafe(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'dashboard_cache' ORDER BY 1
  `);
  console.log("dashboard_cache cols:", cols);

  // closed_at exists?
  const soCols = await p.$queryRawUnsafe(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'service_orders' AND column_name = 'closed_at'
  `);
  console.log("closed_at:", soCols);

  // try counts like getOperationalKpis
  const open = await p.serviceOrder.count({
    where: { organizationId, deletedAt: null, status: { in: ["RECEIVED", "DIAGNOSIS"] } },
  });
  console.log("open count ok:", open);

  const low = await p.$queryRawUnsafe(
    `SELECT COUNT(*)::int as count FROM products WHERE organization_id = $1 AND deleted_at IS NULL AND stock <= min_stock`,
    organizationId,
  );
  console.log("low stock ok:", low);

  try {
    const cache = await p.dashboardCache.findMany({ take: 1 });
    console.log("cache read ok:", cache.length);
  } catch (e) {
    console.error("cache read FAIL:", e.message);
  }
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
