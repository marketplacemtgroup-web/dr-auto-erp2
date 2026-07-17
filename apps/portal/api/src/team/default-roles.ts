import { PrismaService } from '../prisma/prisma.service';

export const ACCESS_PROFILE_SLUGS = [
  'admin',
  'gerente',
  'recepcao',
  'mecanico',
  'estoque',
  'financeiro',
  'vendedor',
  'consulta',
] as const;

export type AccessProfileSlug = (typeof ACCESS_PROFILE_SLUGS)[number];

const PONTO_ESCALAS_GERENTE = [
  'ponto.ver',
  'ponto.ver_todos',
  'ponto.bater',
  'ponto.ajustar',
  'ponto.aprovar_ajuste',
  'ponto.exportar',
  'escalas.ver',
  'escalas.ver_todas',
  'escalas.criar',
  'escalas.editar',
  'escalas.cancelar',
  'escalas.exportar',
  'solicitacoes.ver',
  'solicitacoes.criar',
  'solicitacoes.aprovar',
  'solicitacoes.recusar',
] as const;

const PONTO_ESCALAS_FUNCIONARIO = [
  'ponto.ver',
  'ponto.bater',
  'escalas.ver',
  'solicitacoes.ver',
  'solicitacoes.criar',
  'commissions.view_own',
] as const;

const PONTO_ESCALAS_FINANCEIRO = [
  'ponto.ver_todos',
  'ponto.exportar',
  'escalas.ver_todas',
  'escalas.exportar',
  'solicitacoes.ver',
] as const;

/** Gerente: acesso completo ao negócio (sem painel admin do sistema). */
const GERENTE_PERMISSIONS = [
  'dashboard.view',
  'dashboard.view_financial',
  'financial.view',
  'customers.manage',
  'vehicles.manage',
  'service_orders.manage',
  'quotes.manage',
  'inventory.manage',
  'financial.manage',
  'users.manage',
  'settings.manage',
  'team.manage',
  'team.view_salaries',
  'commissions.manage',
  'commissions.view',
  'payroll.manage',
  ...PONTO_ESCALAS_GERENTE,
] as const;

const DEFAULT_ROLES: {
  slug: AccessProfileSlug;
  name: string;
  permissions: readonly string[];
}[] = [
  {
    slug: 'gerente',
    name: 'Gerente',
    permissions: GERENTE_PERMISSIONS,
  },
  {
    slug: 'recepcao',
    name: 'Recepção',
    permissions: [
      'dashboard.view',
      'customers.manage',
      'vehicles.manage',
      'service_orders.manage',
      'quotes.manage',
      ...PONTO_ESCALAS_FUNCIONARIO,
    ],
  },
  {
    slug: 'mecanico',
    name: 'Mecânico',
    permissions: [
      'dashboard.view',
      'service_orders.manage',
      'quotes.manage',
      'inventory.manage',
      ...PONTO_ESCALAS_FUNCIONARIO,
    ],
  },
  {
    slug: 'estoque',
    name: 'Estoque',
    permissions: ['dashboard.view', 'inventory.manage'],
  },
  {
    slug: 'financeiro',
    name: 'Financeiro',
    permissions: [
      'dashboard.view',
      'dashboard.view_financial',
      'financial.view',
      'financial.manage',
      'team.view_salaries',
      'commissions.view',
      'payroll.manage',
      ...PONTO_ESCALAS_FINANCEIRO,
    ],
  },
  {
    slug: 'vendedor',
    name: 'Vendedor',
    permissions: ['dashboard.view', 'customers.manage', 'quotes.manage'],
  },
  {
    slug: 'consulta',
    name: 'Consulta',
    permissions: ['dashboard.view'],
  },
];

async function syncRolePermissions(
  prisma: PrismaService,
  roleId: string,
  permissionSlugs: readonly string[],
) {
  const permissions = await prisma.permission.findMany({
    where: { slug: { in: [...permissionSlugs] } },
  });
  const permissionIds = permissions.map((p) => p.id);

  await prisma.rolePermission.deleteMany({
    where: {
      roleId,
      permissionId: { notIn: permissionIds },
    },
  });

  for (const permissionId of permissionIds) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
      create: { roleId, permissionId },
      update: {},
    });
  }
}

export async function ensureDefaultRoles(
  prisma: PrismaService,
  organizationId: string,
) {
  const allPermissions = await prisma.permission.findMany();
  const permBySlug = new Map(allPermissions.map((p) => [p.slug, p.id]));

  const adminRole = await prisma.role.findFirst({
    where: { organizationId, slug: 'admin' },
  });
  if (adminRole) {
    await syncRolePermissions(
      prisma,
      adminRole.id,
      allPermissions.map((p) => p.slug),
    );
  }

  for (const def of DEFAULT_ROLES) {
    let role = await prisma.role.findFirst({
      where: { organizationId, slug: def.slug },
    });

    if (!role) {
      const permissionIds = def.permissions
        .map((slug) => permBySlug.get(slug))
        .filter((id): id is string => Boolean(id));

      role = await prisma.role.create({
        data: {
          organizationId,
          slug: def.slug,
          name: def.name,
          isSystem: true,
          permissions: {
            create: permissionIds.map((permissionId) => ({ permissionId })),
          },
        },
      });
      continue;
    }

    await prisma.role.update({
      where: { id: role.id },
      data: { name: def.name, isSystem: true },
    });
    await syncRolePermissions(prisma, role.id, def.permissions);
  }
}

export function isAccessProfileSlug(value: string): value is AccessProfileSlug {
  return (ACCESS_PROFILE_SLUGS as readonly string[]).includes(value);
}

export function userCanViewFinancial(permissions: string[] = []): boolean {
  return (
    permissions.includes('admin.access') ||
    permissions.includes('dashboard.view_financial')
  );
}

export function userCanViewMoney(permissions: string[] = []): boolean {
  return (
    permissions.includes('admin.access') || permissions.includes('financial.view')
  );
}
