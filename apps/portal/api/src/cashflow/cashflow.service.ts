import { Injectable } from '@nestjs/common';
import { LedgerMovementKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';

type GroupBy = 'day' | 'week' | 'month' | 'year';

const INFLOW_KINDS: LedgerMovementKind[] = [
  'RECEIVABLE',
  'TRANSFER_IN',
  'CONTRIBUTION',
  'LOAN_IN',
  'SUPPLY',
];

const OUTFLOW_KINDS: LedgerMovementKind[] = [
  'PAYABLE',
  'TRANSFER_OUT',
  'WITHDRAWAL',
  'LOAN_PAYMENT',
  'WITHDRAWAL_CASH',
  'FEE',
];

@Injectable()
export class CashFlowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  private groupKey(date: Date, groupBy: GroupBy): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    if (groupBy === 'day') return `${y}-${m}-${d}`;
    if (groupBy === 'month') return `${y}-${m}`;
    if (groupBy === 'year') return `${y}`;
    const week = Math.ceil(date.getDate() / 7);
    return `${y}-${m}-W${week}`;
  }

  async report(
    organizationId: string,
    from: string,
    to: string,
    groupBy: GroupBy = 'day',
    accountId?: string,
  ) {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const where: Prisma.FinancialAccountMovementWhereInput = {
      organizationId,
      movementDate: { gte: fromDate, lte: toDate },
      ...(accountId ? { accountId } : {}),
    };

    const movements = await this.prisma.financialAccountMovement.findMany({
      where,
      include: { account: { select: { id: true, name: true, type: true } } },
      orderBy: [{ movementDate: 'asc' }, { createdAt: 'asc' }],
    });

    let openingBalance = 0;
    if (accountId) {
      const account = await this.prisma.financialAccount.findFirst({
        where: { id: accountId, organizationId },
      });
      if (account) {
        const priorMovements = await this.prisma.financialAccountMovement.findMany({
          where: {
            organizationId,
            accountId,
            movementDate: { lt: fromDate },
          },
        });
        openingBalance = this.ledger.roundMoney(Number(account.openingBalance));
        for (const m of priorMovements) {
          const amt = this.ledger.roundMoney(Number(m.amount));
          openingBalance = this.ledger.roundMoney(
            openingBalance + (m.direction === 'CREDIT' ? amt : -amt),
          );
        }
      }
    } else {
      const accounts = await this.prisma.financialAccount.findMany({
        where: { organizationId, status: 'ACTIVE' },
      });
      for (const account of accounts) {
        const priorMovements = await this.prisma.financialAccountMovement.findMany({
          where: {
            organizationId,
            accountId: account.id,
            movementDate: { lt: fromDate },
          },
        });
        let bal = this.ledger.roundMoney(Number(account.openingBalance));
        for (const m of priorMovements) {
          const amt = this.ledger.roundMoney(Number(m.amount));
          bal = this.ledger.roundMoney(bal + (m.direction === 'CREDIT' ? amt : -amt));
        }
        openingBalance = this.ledger.roundMoney(openingBalance + bal);
      }
    }

    const groups = new Map<
      string,
      {
        period: string;
        inflows: number;
        outflows: number;
        transfers: number;
        contributions: number;
        withdrawals: number;
        receivables: number;
        payables: number;
        net: number;
      }
    >();

    let totalIn = 0;
    let totalOut = 0;
    let transfers = 0;
    let contributions = 0;
    let withdrawals = 0;
    let receivables = 0;
    let payables = 0;

    for (const m of movements) {
      const amt = this.ledger.roundMoney(Number(m.amount));
      const key = this.groupKey(m.movementDate, groupBy);
      const row = groups.get(key) ?? {
        period: key,
        inflows: 0,
        outflows: 0,
        transfers: 0,
        contributions: 0,
        withdrawals: 0,
        receivables: 0,
        payables: 0,
        net: 0,
      };

      if (m.direction === 'CREDIT') {
        row.inflows = this.ledger.roundMoney(row.inflows + amt);
        totalIn = this.ledger.roundMoney(totalIn + amt);
        if (m.movementKind === 'RECEIVABLE') {
          row.receivables = this.ledger.roundMoney(row.receivables + amt);
          receivables = this.ledger.roundMoney(receivables + amt);
        }
        if (m.movementKind === 'TRANSFER_IN') {
          row.transfers = this.ledger.roundMoney(row.transfers + amt);
          transfers = this.ledger.roundMoney(transfers + amt);
        }
        if (m.movementKind === 'CONTRIBUTION') {
          row.contributions = this.ledger.roundMoney(row.contributions + amt);
          contributions = this.ledger.roundMoney(contributions + amt);
        }
      } else {
        row.outflows = this.ledger.roundMoney(row.outflows + amt);
        totalOut = this.ledger.roundMoney(totalOut + amt);
        if (m.movementKind === 'PAYABLE') {
          row.payables = this.ledger.roundMoney(row.payables + amt);
          payables = this.ledger.roundMoney(payables + amt);
        }
        if (m.movementKind === 'TRANSFER_OUT') {
          row.transfers = this.ledger.roundMoney(row.transfers + amt);
          transfers = this.ledger.roundMoney(transfers + amt);
        }
        if (m.movementKind === 'WITHDRAWAL') {
          row.withdrawals = this.ledger.roundMoney(row.withdrawals + amt);
          withdrawals = this.ledger.roundMoney(withdrawals + amt);
        }
      }

      row.net = this.ledger.roundMoney(row.inflows - row.outflows);
      groups.set(key, row);
    }

    const closingBalance = this.ledger.roundMoney(openingBalance + totalIn - totalOut);

    return {
      from,
      to,
      groupBy,
      accountId: accountId ?? null,
      openingBalance,
      closingBalance,
      totalInflows: totalIn,
      totalOutflows: totalOut,
      transfers,
      contributions,
      withdrawals,
      receivables,
      payables,
      periods: Array.from(groups.values()).sort((a, b) =>
        a.period.localeCompare(b.period),
      ),
      movements: movements.map((m) => ({
        id: m.id,
        accountName: m.account.name,
        direction: m.direction,
        amount: Number(m.amount),
        movementKind: m.movementKind,
        movementDate: m.movementDate,
        description: m.description,
        reconciliationStatus: m.reconciliationStatus,
      })),
    };
  }
}
