import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Apenas dados de sistema (permissões globais). Sem oficina, usuário ou registros de negócio. */
const PERMISSIONS = [
  { slug: 'dashboard.view', name: 'Ver painel operacional', module: 'dashboard' },
  {
    slug: 'dashboard.view_financial',
    name: 'Ver indicadores financeiros no dashboard',
    module: 'dashboard',
  },
  { slug: 'financial.view', name: 'Ver valores em reais no sistema', module: 'financial' },
  { slug: 'customers.manage', name: 'Gerenciar clientes', module: 'customers' },
  { slug: 'vehicles.manage', name: 'Gerenciar veículos', module: 'vehicles' },
  { slug: 'service_orders.manage', name: 'Gerenciar OS', module: 'service_orders' },
  { slug: 'quotes.manage', name: 'Gerenciar orçamentos', module: 'quotes' },
  { slug: 'inventory.manage', name: 'Gerenciar estoque', module: 'inventory' },
  { slug: 'financial.manage', name: 'Gerenciar financeiro', module: 'financial' },
  { slug: 'users.manage', name: 'Gerenciar usuários', module: 'users' },
  { slug: 'settings.manage', name: 'Configurações', module: 'settings' },
  { slug: 'admin.access', name: 'Painel administrativo', module: 'admin' },
  { slug: 'team.manage', name: 'Gerenciar equipe e funcionários', module: 'team' },
  { slug: 'team.view_salaries', name: 'Ver salários e pagamentos', module: 'team' },
  { slug: 'commissions.manage', name: 'Gerenciar comissões', module: 'commissions' },
  { slug: 'commissions.view', name: 'Ver comissões', module: 'commissions' },
  { slug: 'payroll.manage', name: 'Fechar pagamentos da equipe', module: 'payroll' },
];

async function main() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { slug: p.slug },
      create: p,
      update: { name: p.name, module: p.module },
    });
  }

  const newSlugs = [
    'dashboard.view_financial',
    'financial.view',
    'team.manage',
    'team.view_salaries',
    'commissions.manage',
    'commissions.view',
    'payroll.manage',
  ];
  const newPerms = await prisma.permission.findMany({
    where: { slug: { in: newSlugs } },
  });
  const adminRoles = await prisma.role.findMany({
    where: { slug: 'admin', isSystem: true },
  });
  for (const role of adminRoles) {
    for (const perm of newPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: perm.id },
        },
        create: { roleId: role.id, permissionId: perm.id },
        update: {},
      });
    }
  }

  console.log(
    'Seed de sistema OK — permissões criadas. Configure WTEC Motors em /cadastro (apenas na primeira vez).',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
