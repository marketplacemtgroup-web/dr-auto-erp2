import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Apenas dados de sistema (permissões globais). Sem oficina, usuário ou registros de negócio. */
const PERMISSIONS = [
  { slug: 'dashboard.view', name: 'Ver dashboard', module: 'dashboard' },
  { slug: 'customers.manage', name: 'Gerenciar clientes', module: 'customers' },
  { slug: 'vehicles.manage', name: 'Gerenciar veículos', module: 'vehicles' },
  { slug: 'service_orders.manage', name: 'Gerenciar OS', module: 'service_orders' },
  { slug: 'quotes.manage', name: 'Gerenciar orçamentos', module: 'quotes' },
  { slug: 'inventory.manage', name: 'Gerenciar estoque', module: 'inventory' },
  { slug: 'financial.manage', name: 'Gerenciar financeiro', module: 'financial' },
  { slug: 'users.manage', name: 'Gerenciar usuários', module: 'users' },
  { slug: 'settings.manage', name: 'Configurações', module: 'settings' },
  { slug: 'admin.access', name: 'Painel administrativo', module: 'admin' },
];

async function main() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { slug: p.slug },
      create: p,
      update: { name: p.name, module: p.module },
    });
  }

  console.log(
    'Seed de sistema OK — permissões criadas. Configure Scalibur em /cadastro (apenas na primeira vez).',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
