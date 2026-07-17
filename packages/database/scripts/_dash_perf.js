const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
async function profit(organizationId, from, to) {
  return p.serviceOrderItem.findMany({
    where: {
      organizationId,
      serviceOrder: {
        organizationId,
        status: { in: ["FINISHED", "DELIVERED", "AWAITING_PAYMENT"] },
        closedAt: { gte: from, lte: to },
        deletedAt: null,
      },
    },
    include: { product: { select: { costPrice: true, averageCost: true } } },
  });
}
(async () => {
  const org = await p.organization.findFirst({ select: { id: true } });
  const organizationId = org.id;
  const today = new Date(); today.setHours(0,0,0,0);
  const todayEnd = new Date(today); todayEnd.setHours(23,59,59,999);
  const y = new Date(today); y.setDate(y.getDate()-1);
  const yEnd = new Date(y); yEnd.setHours(23,59,59,999);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  console.time("financial-parallel");
  await Promise.all([
    profit(organizationId, monthStart, todayEnd),
    profit(organizationId, today, todayEnd),
    profit(organizationId, y, yEnd),
    p.financialEntry.aggregate({ where: { organizationId, status: "PAID", type: "RECEIVABLE" }, _sum: { amount: true } }),
    p.serviceOrder.findMany({
      where: { organizationId, deletedAt: null, status: { in: ["FINISHED","DELIVERED","AWAITING_PAYMENT"] }, closedAt: { gte: monthStart, lte: todayEnd } },
      select: { totalAmount: true, createdAt: true, closedAt: true },
    }),
  ]);
  console.timeEnd("financial-parallel");
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
