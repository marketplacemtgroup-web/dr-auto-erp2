import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReconciliationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  list(organizationId: string) {
    return this.prisma.bankReconciliation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async create(
    organizationId: string,
    dto: {
      accountId: string;
      periodStart: string;
      periodEnd: string;
      bankBalance: number;
      notes?: string;
    },
    userId?: string,
  ) {
    const account = await this.prisma.financialAccount.findFirst({
      where: { id: dto.accountId, organizationId },
    });
    if (!account) throw new NotFoundException('Conta não encontrada');

    const systemBalance = this.ledger.roundMoney(Number(account.currentBalance));
    const bankBalance = this.ledger.roundMoney(dto.bankBalance);
    const difference = this.ledger.roundMoney(bankBalance - systemBalance);

    return this.prisma.bankReconciliation.create({
      data: {
        organizationId,
        accountId: dto.accountId,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        bankBalance: new Prisma.Decimal(bankBalance),
        systemBalance: new Prisma.Decimal(systemBalance),
        difference: new Prisma.Decimal(difference),
        notes: dto.notes ?? null,
        reconciledAt: difference === 0 ? new Date() : null,
        createdByUserId: userId ?? null,
      },
    });
  }

  async updateMovementStatus(
    organizationId: string,
    movementId: string,
    status: ReconciliationStatus,
  ) {
    const movement = await this.prisma.financialAccountMovement.findFirst({
      where: { id: movementId, organizationId },
    });
    if (!movement) throw new NotFoundException('Movimento não encontrado');

    return this.prisma.financialAccountMovement.update({
      where: { id: movementId },
      data: { reconciliationStatus: status },
    });
  }

  async listPendingMovements(organizationId: string, accountId: string) {
    return this.prisma.financialAccountMovement.findMany({
      where: {
        organizationId,
        accountId,
        reconciliationStatus: { in: ['PENDING', 'DIFFERENCE'] },
      },
      orderBy: { movementDate: 'desc' },
      take: 100,
    });
  }
}
