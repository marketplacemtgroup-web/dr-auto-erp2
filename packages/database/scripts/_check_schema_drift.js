const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const expected = [
    ["service_orders", "closed_at"],
    ["service_orders", "co_execution_by_id"],
    ["service_order_items", "outsourced_service_id"],
    ["service_order_items", "co_executor_id"],
    ["service_order_items", "actual_description"],
    ["quotes", "summary_mode"],
    ["quotes", "free_text_enabled"],
    ["financial_entries", "account_id"],
    ["products", "status"],
  ];

  for (const [table, col] of expected) {
    const rows = await p.$queryRawUnsafe(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      table,
      col,
    );
    console.log(`${table}.${col}: ${rows.length ? "OK" : "MISSING"}`);
  }

  const tables = [
    "fixed_expenses",
    "outsourced_services",
    "financial_accounts",
    "dashboard_cache",
    "service_order_item_cost_history",
  ];
  for (const t of tables) {
    const rows = await p.$queryRawUnsafe(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
      t,
    );
    console.log(`table ${t}: ${rows.length ? "OK" : "MISSING"}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
