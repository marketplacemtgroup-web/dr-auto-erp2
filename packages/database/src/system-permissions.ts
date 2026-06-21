import type { PrismaClient } from '@prisma/client';

/** Permissões globais do sistema (seed + cadastro inicial). */
export const SYSTEM_PERMISSIONS = [
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
  { slug: 'suppliers.manage', name: 'Gerenciar fornecedores', module: 'suppliers' },
  { slug: 'purchases.manage', name: 'Gerenciar compras', module: 'purchases' },
  { slug: 'financial.manage', name: 'Gerenciar financeiro', module: 'financial' },
  { slug: 'users.manage', name: 'Gerenciar usuários', module: 'users' },
  { slug: 'settings.manage', name: 'Configurações', module: 'settings' },
  { slug: 'admin.access', name: 'Painel administrativo', module: 'admin' },
  { slug: 'team.manage', name: 'Gerenciar equipe e funcionários', module: 'team' },
  { slug: 'team.view_salaries', name: 'Ver salários e pagamentos', module: 'team' },
  { slug: 'commissions.manage', name: 'Gerenciar comissões', module: 'commissions' },
  { slug: 'commissions.view', name: 'Ver comissões', module: 'commissions' },
  { slug: 'commissions.view_own', name: 'Ver próprias comissões (app colaborador)', module: 'commissions' },
  { slug: 'payroll.manage', name: 'Fechar pagamentos da equipe', module: 'payroll' },
  { slug: 'ponto.ver', name: 'Ver próprio ponto', module: 'ponto' },
  { slug: 'ponto.ver_todos', name: 'Ver ponto de toda a equipe', module: 'ponto' },
  { slug: 'ponto.bater', name: 'Registrar ponto', module: 'ponto' },
  { slug: 'ponto.ajustar', name: 'Ajustar registros de ponto', module: 'ponto' },
  { slug: 'ponto.aprovar_ajuste', name: 'Aprovar ajustes de ponto', module: 'ponto' },
  { slug: 'ponto.exportar', name: 'Exportar relatórios de ponto', module: 'ponto' },
  { slug: 'escalas.ver', name: 'Ver própria escala', module: 'escalas' },
  { slug: 'escalas.ver_todas', name: 'Ver escalas de toda a equipe', module: 'escalas' },
  { slug: 'escalas.criar', name: 'Criar escalas', module: 'escalas' },
  { slug: 'escalas.editar', name: 'Editar escalas', module: 'escalas' },
  { slug: 'escalas.cancelar', name: 'Cancelar escalas', module: 'escalas' },
  { slug: 'escalas.exportar', name: 'Exportar relatórios de escalas', module: 'escalas' },
  { slug: 'solicitacoes.ver', name: 'Ver solicitações', module: 'solicitacoes' },
  { slug: 'solicitacoes.criar', name: 'Criar solicitações', module: 'solicitacoes' },
  { slug: 'solicitacoes.aprovar', name: 'Aprovar solicitações', module: 'solicitacoes' },
  { slug: 'solicitacoes.recusar', name: 'Recusar solicitações', module: 'solicitacoes' },
] as const;

export async function ensureSystemPermissions(prisma: PrismaClient): Promise<void> {
  for (const p of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { slug: p.slug },
      create: p,
      update: { name: p.name, module: p.module },
    });
  }
}

/** Garante que todos os roles admin do sistema tenham todas as permissões. */
export async function syncAdminRolePermissions(prisma: PrismaClient): Promise<void> {
  const allPerms = await prisma.permission.findMany();
  const adminRoles = await prisma.role.findMany({
    where: { slug: 'admin', isSystem: true },
  });
  for (const role of adminRoles) {
    for (const perm of allPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: perm.id },
        },
        create: { roleId: role.id, permissionId: perm.id },
        update: {},
      });
    }
  }
}
