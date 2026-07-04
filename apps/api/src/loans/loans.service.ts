import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import { AccountsService } from '../accounts/accounts.service';
import { FinancialService } from '../financial/financial.service';
import { CreateLoanDto } from './dto/loan.dto';

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ledger: LedgerService,
    private readonly accounts: AccountsService,
    private readonly financial: FinancialService,
  ) {}

  list(organizationId: string) {
    return this.prisma.loan.findMany({
      where: { organizationId },
      include: {
        destinationAccount: { select: { id: true, name: true } },
        loanInstallments: { orderBy: { installmentNumber: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(organizationId: string, id: string) {
    return this.prisma.loan.findFirst({
      where: { id, organizationId },
      include: {
        destinationAccount: { select: { id: true, name: true } },
        loanInstallments: { orderBy: { installmentNumber: 'asc' } },
      },
    });
  }

  async create(organizationId: string, dto: CreateLoanDto, userId?: string) {
    await this.accounts.findAccount(organizationId, dto.destinationAccountId);
    await this.financial.ensureDefaultCategories(organizationId);

    const principal = this.ledger.roundMoney(dto.principalAmount);
    const installmentAmount = this.ledger.roundMoney(dto.installmentAmount);
    const receivedAt = new Date();

    const loan = await this.prisma.$transaction(async (tx) => {
      const row = await tx.loan.create({
        data: {
          organizationId,
          bankName: dto.bankName.trim(),
          contractNumber: dto.contractNumber ?? null,
          principalAmount: new Prisma.Decimal(principal),
          interestRate:
            dto.interestRate != null
              ? new Prisma.Decimal(dto.interestRate)
              : null,
          installments: dto.installments,
          installmentAmount: new Prisma.Decimal(installmentAmount),
          firstDueDate: new Date(dto.firstDueDate),
          destinationAccountId: dto.destinationAccountId,
          outstandingBalance: new Prisma.Decimal(principal),
          status: 'ACTIVE',
          receivedAt,
          notes: dto.notes ?? null,
          createdByUserId: userId ?? null,
        },
      });

      await this.ledger.post(tx, {
        organizationId,
        accountId: dto.destinationAccountId,
        direction: 'CREDIT',
        amount: principal,
        movementKind: 'LOAN_IN',
        movementDate: receivedAt,
        description: `Empréstimo — ${dto.bankName}`,
        loanId: row.id,
        createdByUserId: userId,
      });

      const category = await tx.financialCategory.findFirst({
        where: { organizationId, name: 'Juros e multas', type: 'EXPENSE' },
      });

      const baseDate = new Date(dto.firstDueDate);
      for (let i = 1; i <= dto.installments; i++) {
        const due = new Date(baseDate);
        due.setMonth(due.getMonth() + (i - 1));

        const installment = await tx.loanInstallment.create({
          data: {
            organizationId,
            loanId: row.id,
            installmentNumber: i,
            dueDate: due,
            amount: new Prisma.Decimal(installmentAmount),
            status: 'OPEN',
          },
        });

        const payable = await tx.financialEntry.create({
          data: {
            organizationId,
            description: `Empréstimo ${dto.bankName} — parcela ${i}/${dto.installments}`,
            type: 'PAYABLE',
            dueDate: due,
            amount: new Prisma.Decimal(installmentAmount),
            status: 'OPEN',
            financialCategoryId: category?.id ?? null,
            origin: 'LOAN',
            installmentNumber: i,
            installmentTotal: dto.installments,
          },
        });

        await tx.loanInstallment.update({
          where: { id: installment.id },
          data: { financialEntryId: payable.id },
        });
      }

      return row;
    });

    await this.audit.log(organizationId, 'loan.create', 'loan', {
      userId,
      metadata: { loanId: loan.id, principal },
    });

    return this.findOne(organizationId, loan.id);
  }

  async markInstallmentPaid(
    organizationId: string,
    installmentId: string,
    accountId: string,
    userId?: string,
  ) {
    const installment = await this.prisma.loanInstallment.findFirst({
      where: { id: installmentId, organizationId },
      include: { loan: true, financialEntry: true },
    });
    if (!installment) throw new NotFoundException('Parcela não encontrada');
    if (installment.status === 'PAID') {
      throw new BadRequestException('Parcela já paga');
    }

    const amount = this.ledger.roundMoney(Number(installment.amount));

    await this.prisma.$transaction(async (tx) => {
      if (installment.financialEntryId && installment.financialEntry) {
        await this.ledger.post(tx, {
          organizationId,
          accountId,
          direction: 'DEBIT',
          amount,
          movementKind: 'LOAN_PAYMENT',
          movementDate: new Date(),
          description: installment.financialEntry.description,
          financialEntryId: installment.financialEntryId,
          loanId: installment.loanId,
          loanInstallmentId: installment.id,
          createdByUserId: userId,
        });

        await tx.financialEntry.update({
          where: { id: installment.financialEntryId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            amountPaid: new Prisma.Decimal(amount),
            amountReceived: new Prisma.Decimal(amount),
            accountId,
          },
        });
      }

      await tx.loanInstallment.update({
        where: { id: installmentId },
        data: { status: 'PAID', paidAt: new Date() },
      });

      const newBalance = this.ledger.roundMoney(
        Number(installment.loan.outstandingBalance) - amount,
      );

      await tx.loan.update({
        where: { id: installment.loanId },
        data: {
          outstandingBalance: new Prisma.Decimal(Math.max(newBalance, 0)),
          status: newBalance <= 0 ? 'PAID' : 'ACTIVE',
        },
      });
    });

    return this.findOne(organizationId, installment.loanId);
  }
}
