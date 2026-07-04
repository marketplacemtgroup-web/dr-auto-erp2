/**
 * Backfill idempotente do razão (FinancialAccountMovement) a partir de:
 * - Lançamentos financeiros já pagos (PAID)
 * - Movimentos de caixa (CashRegisterMovement) vinculados à conta principal
 *
 * Uso: node packages/database/scripts/backfill-ledger.mjs
 * Requer DATABASE_URL no ambiente.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

async function recomputeBalance(organizationId, accountId) {
  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, organizationId },
  });
  if (!account) return;

  const movements = await prisma.financialAccountMovement.findMany({
    where: { accountId, organizationId },
    orderBy: [{ movementDate: 'asc' }, { createdAt: 'asc' }],
  });

  let balance = roundMoney(Number(account.openingBalance));
  for (const m of movements) {
    const amt = roundMoney(Number(m.amount));
    balance = roundMoney(balance + (m.direction === 'CREDIT' ? amt : -amt));
  }

  await prisma.financialAccount.update({
    where: { id: accountId },
    data: { currentBalance: new Prisma.Decimal(balance) },
  });
}

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true } });
  let created = 0;

  for (const org of orgs) {
    const primary = await prisma.financialAccount.findFirst({
      where: { organizationId: org.id, isPrimary: true },
    });
    if (!primary) continue;

    const paidEntries = await prisma.financialEntry.findMany({
      where: {
        organizationId: org.id,
        status: { in: ['PAID', 'PARTIAL'] },
        amountPaid: { gt: 0 },
      },
      include: { paymentSplits: true },
    });

    for (const entry of paidEntries) {
      const existing = await prisma.financialAccountMovement.count({
        where: { financialEntryId: entry.id },
      });
      if (existing > 0) continue;

      const paidAt = entry.paidAt ?? entry.dueDate;
      const accountId = entry.accountId ?? primary.id;
      const direction = entry.type === 'RECEIVABLE' ? 'CREDIT' : 'DEBIT';
      const kind = entry.type === 'RECEIVABLE' ? 'RECEIVABLE' : 'PAYABLE';

      if (entry.paymentSplits.length > 0) {
        for (const split of entry.paymentSplits) {
          const amt = roundMoney(Number(split.amount));
          if (amt <= 0) continue;
          await prisma.financialAccountMovement.create({
            data: {
              organizationId: org.id,
              accountId: split.accountId ?? accountId,
              direction,
              amount: new Prisma.Decimal(amt),
              balanceAfter: new Prisma.Decimal(0),
              movementKind: kind,
              movementDate: paidAt,
              description: `${entry.description} — ${split.paymentMethod} (backfill)`,
              financialEntryId: entry.id,
            },
          });
          created += 1;
        }
      } else {
        const amt = roundMoney(Number(entry.amountPaid ?? entry.amountReceived ?? entry.amount));
        if (amt <= 0) continue;
        await prisma.financialAccountMovement.create({
          data: {
            organizationId: org.id,
            accountId,
            direction,
            amount: new Prisma.Decimal(amt),
            balanceAfter: new Prisma.Decimal(0),
            movementKind: kind,
            movementDate: paidAt,
            description: `${entry.description} (backfill)`,
            financialEntryId: entry.id,
          },
        });
        created += 1;
      }
    }

    const cashMovements = await prisma.cashRegisterMovement.findMany({
      where: {
        organizationId: org.id,
        session: { accountId: { not: null } },
      },
      include: { session: true },
    });

    for (const cm of cashMovements) {
      const existing = await prisma.financialAccountMovement.count({
        where: { cashMovementId: cm.id },
      });
      if (existing > 0) continue;

      const accountId = cm.session.accountId ?? primary.id;
      const isIn = cm.movementType === 'SUPPLY' || cm.movementType === 'PAYMENT_IN';
      await prisma.financialAccountMovement.create({
        data: {
          organizationId: org.id,
          accountId,
          direction: isIn ? 'CREDIT' : 'DEBIT',
          amount: new Prisma.Decimal(roundMoney(Number(cm.amount))),
          balanceAfter: new Prisma.Decimal(0),
          movementKind: cm.movementType === 'SUPPLY' ? 'SUPPLY' : cm.movementType === 'WITHDRAWAL' ? 'WITHDRAWAL_CASH' : isIn ? 'RECEIVABLE' : 'PAYABLE',
          movementDate: cm.createdAt,
          description: cm.description ?? `Caixa — ${cm.movementType} (backfill)`,
          cashMovementId: cm.id,
        },
      });
      created += 1;
    }

    const accounts = await prisma.financialAccount.findMany({
      where: { organizationId: org.id },
      select: { id: true },
    });
    for (const acc of accounts) {
      await recomputeBalance(org.id, acc.id);
    }
  }

  console.log(`Backfill concluído. Movimentos criados: ${created}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
