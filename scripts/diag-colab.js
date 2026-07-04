/* Diagnóstico do App Colaborador: vínculos, permissões e ponto. */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  console.log('== ORGS ==');
  console.table(orgs);

  const members = await prisma.organizationMember.findMany({
    where: { isActive: true },
    include: {
      user: { select: { email: true, name: true, isActive: true } },
      role: { select: { slug: true, name: true, permissions: { include: { permission: { select: { slug: true } } } } } },
    },
  });

  console.log('\n== MEMBERS (usuarios de login) ==');
  for (const m of members) {
    const perms = m.role?.permissions?.map((p) => p.permission.slug) ?? [];
    const emp = await prisma.employee.findFirst({
      where: { organizationId: m.organizationId, memberId: m.id },
      select: { id: true, name: true, status: true },
    });
    console.log(`- ${m.user.email} | user=${m.user.name} | ativo=${m.user.isActive} | role=${m.role?.slug}`);
    console.log(`    memberId=${m.id}`);
    console.log(`    employee vinculado: ${emp ? `${emp.name} (${emp.status})` : '*** NENHUM ***'}`);
    const pontoPerms = perms.filter((p) => p.startsWith('ponto') || p.startsWith('escalas') || p.startsWith('solicitacoes') || p === 'team.manage' || p === 'admin.access' || p === 'commissions.view_own');
    console.log(`    perms ponto/escala: [${pontoPerms.join(', ')}]`);
  }

  console.log('\n== EMPLOYEES ==');
  const emps = await prisma.employee.findMany({
    select: { id: true, name: true, status: true, memberId: true, jobTitle: { select: { name: true } } },
  });
  for (const e of emps) {
    console.log(`- ${e.name} | status=${e.status} | cargo=${e.jobTitle?.name ?? '-'} | memberId=${e.memberId ?? '*** SEM VINCULO ***'}`);
  }

  console.log('\n== PONTO: ENTRADAS (ultimas 15) ==');
  const entries = await prisma.employeeTimeClockEntry.findMany({
    orderBy: { recordedAt: 'desc' },
    take: 15,
    select: { entryType: true, recordedAt: true, entryDate: true, origin: true, status: true, employee: { select: { name: true } } },
  });
  for (const en of entries) {
    console.log(`- ${en.employee?.name} | ${en.entryType} | rec=${en.recordedAt?.toISOString()} | dia=${en.entryDate?.toISOString().slice(0,10)} | ${en.origin} | ${en.status}`);
  }

  console.log('\n== PONTO: total de entradas ==', await prisma.employeeTimeClockEntry.count());
  console.log('== ESCALAS: total ==', await prisma.employeeSchedule.count());
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1); }).finally(() => prisma.$disconnect());
