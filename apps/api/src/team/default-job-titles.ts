import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_JOB_TITLES = [
  { name: 'Administrador', isTechnical: false },
  { name: 'Gerente', isTechnical: false },
  { name: 'Recepção', isTechnical: false },
  { name: 'Mecânico', isTechnical: true },
  { name: 'Auxiliar mecânico', isTechnical: true },
  { name: 'Estoquista', isTechnical: false },
  { name: 'Financeiro', isTechnical: false },
  { name: 'Vendedor', isTechnical: false },
  { name: 'Lavador / Preparador', isTechnical: false },
  { name: 'Técnico elétrico', isTechnical: true },
  { name: 'Terceirizado', isTechnical: true },
];

export async function ensureDefaultJobTitles(
  prisma: PrismaService,
  organizationId: string,
) {
  const count = await prisma.jobTitle.count({ where: { organizationId } });
  if (count > 0) return;
  await prisma.jobTitle.createMany({
    data: DEFAULT_JOB_TITLES.map((t) => ({
      organizationId,
      name: t.name,
      isTechnical: t.isTechnical,
    })),
    skipDuplicates: true,
  });
}
