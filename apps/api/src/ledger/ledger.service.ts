import { BadRequestException, Injectable } from '@nestjs/common';
import {
  LedgerDirection,
  LedgerMovementKind,
  Prisma,
  ReconciliationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type LedgerPostInput = {
  organizationId: string;
  accountId: string;
  direction: LedgerDirection;
  amount: number;
  movementKind: LedgerMovementKind;
  movementDate: Date | string;
  description?: string;
  financialEntryId?: string;
  transferId?: string;
  contributionId?: string;
  withdrawalId?: string;
  loanId?: string;
  loanInstallmentId?: string;
  cashMovementId?: string;
  reconciliationStatus?: ReconciliationStatus;
  externalRef?: string;
  createdByUserId?: string;
};

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }

  resolveMovementDate(value: Date | string): Date {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T12:00:00.000Z`);
    }
    return value instanceof Date ? value : new Date(value);
  }

  /** Única porta de escrita no razão — deve ser chamada dentro de $transaction. */
  async post(tx: Prisma.TransactionClient, input: LedgerPostInput) {
    const amount = this.roundMoney(input.amount);
    if (amount <= 0) {
      throw new BadRequestException('Valor do movimento deve ser maior que zero');
    }

    const account = await tx.financialAccount.findFirst({
      where: { id: input.accountId, organizationId: input.organizationId },
    });
    if (!account) throw new BadRequestException('Conta financeira não encontrada');
    if (account.status !== 'ACTIVE') {
      throw new BadRequestException('Conta financeira inativa');
    }
    if (!account.allowsMovement) {
      throw new BadRequestException('Esta conta não permite movimentação');
    }

    const current = this.roundMoney(Number(account.currentBalance));
    const delta = input.direction === 'CREDIT' ? amount : -amount;
    const balanceAfter = this.roundMoney(current + delta);
    if (balanceAfter < -0.001) {
      throw new BadRequestException(
        `Saldo insuficiente na conta "${account.name}" (saldo: R$ ${current.toFixed(2)})`,
      );
    }

    await tx.financialAccount.update({
      where: { id: account.id },
      data: { currentBalance: new Prisma.Decimal(balanceAfter) },
    });

    return tx.financialAccountMovement.create({
      data: {
        organizationId: input.organizationId,
        accountId: input.accountId,
        direction: input.direction,
        amount: new Prisma.Decimal(amount),
        balanceAfter: new Prisma.Decimal(balanceAfter),
        movementKind: input.movementKind,
        movementDate: this.resolveMovementDate(input.movementDate),
        description: input.description ?? null,
        financialEntryId: input.financialEntryId ?? null,
        transferId: input.transferId ?? null,
        contributionId: input.contributionId ?? null,
        withdrawalId: input.withdrawalId ?? null,
        loanId: input.loanId ?? null,
        loanInstallmentId: input.loanInstallmentId ?? null,
        cashMovementId: input.cashMovementId ?? null,
        reconciliationStatus: input.reconciliationStatus ?? 'PENDING',
        externalRef: input.externalRef ?? null,
        createdByUserId: input.createdByUserId ?? null,
      },
    });
  }

  /** Recomputa saldo a partir do razão (auditoria / correção). */
  async recomputeBalance(organizationId: string, accountId: string) {
    const account = await this.prisma.financialAccount.findFirst({
      where: { id: accountId, organizationId },
    });
    if (!account) throw new BadRequestException('Conta não encontrada');

    const movements = await this.prisma.financialAccountMovement.findMany({
      where: { accountId, organizationId },
      orderBy: [{ movementDate: 'asc' }, { createdAt: 'asc' }],
    });

    let balance = this.roundMoney(Number(account.openingBalance));
    for (const m of movements) {
      const amt = this.roundMoney(Number(m.amount));
      balance = this.roundMoney(
        balance + (m.direction === 'CREDIT' ? amt : -amt),
      );
    }

    await this.prisma.financialAccount.update({
      where: { id: accountId },
      data: { currentBalance: new Prisma.Decimal(balance) },
    });

    return { accountId, balance, movementCount: movements.length };
  }

  async recomputeAllBalances(organizationId: string) {
    const accounts = await this.prisma.financialAccount.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const results = [];
    for (const account of accounts) {
      results.push(await this.recomputeBalance(organizationId, account.id));
    }
    return results;
  }
}
