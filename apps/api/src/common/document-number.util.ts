import { PrismaClient } from '@prisma/client';

/** Novos orçamentos/OS começam em 1100 (não corrige histórico abaixo disso). */
export const DOCUMENT_NUMBER_FLOOR = 1099;

type PrismaLike = Pick<PrismaClient, 'serviceOrder' | 'quote'>;

/**
 * Próximo número compartilhado entre OS e orçamento.
 * Usa o maior número já existente nas duas tabelas, com piso em 1100.
 */
export async function nextDocumentNumber(
  prisma: PrismaLike,
  organizationId: string,
): Promise<number> {
  const [lastOs, lastQuote] = await Promise.all([
    prisma.serviceOrder.findFirst({
      where: { organizationId },
      orderBy: { number: 'desc' },
      select: { number: true },
    }),
    prisma.quote.findFirst({
      where: { organizationId, number: { not: null } },
      orderBy: { number: 'desc' },
      select: { number: true },
    }),
  ]);

  const highest = Math.max(
    lastOs?.number ?? DOCUMENT_NUMBER_FLOOR,
    lastQuote?.number ?? DOCUMENT_NUMBER_FLOOR,
    DOCUMENT_NUMBER_FLOOR,
  );
  return highest + 1;
}

/**
 * Número do orçamento alinhado à OS.
 * Reusa `preferred` (ex.: draft) se existir; senão tenta o número da OS;
 * se esse número já estiver ocupado por outro orçamento (histórico), gera o próximo.
 */
export async function quoteNumberMatchingOs(
  prisma: PrismaLike,
  organizationId: string,
  serviceOrderNumber: number,
  preferred?: number | null,
): Promise<number> {
  if (preferred != null) return preferred;

  const taken = await prisma.quote.findFirst({
    where: { organizationId, number: serviceOrderNumber },
    select: { id: true },
  });
  if (!taken) return serviceOrderNumber;

  return nextDocumentNumber(prisma, organizationId);
}
