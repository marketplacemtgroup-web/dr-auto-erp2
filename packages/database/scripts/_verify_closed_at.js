const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const closed = await p.$queryRawUnsafe(`
    SELECT 1 FROM information_schema.columns
    WHERE table_name='service_orders' AND column_name='closed_at'
  `);
  console.log("closed_at:", closed.length ? "OK" : "MISSING");

  const n = await p.serviceOrder.count({
    where: { closedAt: { gte: new Date("2020-01-01") } },
  });
  console.log("closedAt prisma query OK, matches:", n);

  // Simulate financial kpi piece
  const org = await p.organization.findFirst({ select: { id: true } });
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const rows = await p.serviceOrder.findMany({
    where: {
      organizationId: org.id,
      deletedAt: null,
      status: { in: ["FINISHED", "DELIVERED", "AWAITING_PAYMENT"] },
      closedAt: { gte: monthStart },
    },
    select: { totalAmount: true, createdAt: true, closedAt: true },
    take: 5,
  });
  console.log("dashboard closedAt filter OK, sample:", rows.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
