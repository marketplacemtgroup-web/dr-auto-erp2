import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import { AccountsService } from '../accounts/accounts.service';
import {
  CreateContributionDto,
  CreateTransferDto,
  CreateWithdrawalDto,
} from './dto/equity.dto';
import { parseListQuery, paginatedResponse } from '../common/pagination';

@Injectable()
export class EquityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ledger: LedgerService,
    private readonly accounts: AccountsService,
  ) {}

  async listTransfers(organizationId: string, query: { page?: string; limit?: string } = {}) {
    const { page, limit, skip } = parseListQuery(query);
    const where = { organizationId };
    const [total, rows] = await Promise.all([
      this.prisma.financialTransfer.count({ where }),
      this.prisma.financialTransfer.findMany({
        where,
        include: {
          fromAccount: { select: { id: true, name: true } },
          toAccount: { select: { id: true, name: true } },
        },
        orderBy: { transferDate: 'desc' },
        skip,
        take: limit,
      }),
    ]);
    return paginatedResponse(rows, total, page, limit);
  }

  async createTransfer(
    organizationId: string,
    dto: CreateTransferDto,
    userId?: string,
  ) {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Conta origem e destino devem ser diferentes');
    }

    await this.accounts.findAccount(organizationId, dto.fromAccountId);
    await this.accounts.findAccount(organizationId, dto.toAccountId);

    const amount = this.ledger.roundMoney(dto.amount);

    const transfer = await this.prisma.$transaction(async (tx) => {
      const row = await tx.financialTransfer.create({
        data: {
          organizationId,
          fromAccountId: dto.fromAccountId,
          toAccountId: dto.toAccountId,
          amount: new Prisma.Decimal(amount),
          transferDate: new Date(dto.transferDate),
          notes: dto.notes ?? null,
          attachmentUrl: dto.attachmentUrl ?? null,
          status: 'COMPLETED',
          createdByUserId: userId ?? null,
        },
      });

      await this.ledger.post(tx, {
        organizationId,
        accountId: dto.fromAccountId,
        direction: 'DEBIT',
        amount,
        movementKind: 'TRANSFER_OUT',
        movementDate: dto.transferDate,
        description: dto.notes ?? 'Transferência entre contas',
        transferId: row.id,
        createdByUserId: userId,
      });

      await this.ledger.post(tx, {
        organizationId,
        accountId: dto.toAccountId,
        direction: 'CREDIT',
        amount,
        movementKind: 'TRANSFER_IN',
        movementDate: dto.transferDate,
        description: dto.notes ?? 'Transferência entre contas',
        transferId: row.id,
        createdByUserId: userId,
      });

      return row;
    });

    await this.audit.log(organizationId, 'transfer.create', 'financial_transfer', {
      userId,
      metadata: { transferId: transfer.id, amount },
    });

    return transfer;
  }

  async listContributions(organizationId: string) {
    return this.prisma.capitalContribution.findMany({
      where: { organizationId },
      include: { toAccount: { select: { id: true, name: true } } },
      orderBy: { contributionDate: 'desc' },
    });
  }

  async createContribution(
    organizationId: string,
    dto: CreateContributionDto,
    userId?: string,
  ) {
    await this.accounts.findAccount(organizationId, dto.toAccountId);
    const amount = this.ledger.roundMoney(dto.amount);

    const contribution = await this.prisma.$transaction(async (tx) => {
      const row = await tx.capitalContribution.create({
        data: {
          organizationId,
          partnerName: dto.partnerName.trim(),
          fromAccountId: dto.fromAccountId ?? null,
          toAccountId: dto.toAccountId,
          amount: new Prisma.Decimal(amount),
          contributionDate: new Date(dto.contributionDate),
          reason: dto.reason ?? null,
          createdByUserId: userId ?? null,
        },
      });

      await this.ledger.post(tx, {
        organizationId,
        accountId: dto.toAccountId,
        direction: 'CREDIT',
        amount,
        movementKind: 'CONTRIBUTION',
        movementDate: dto.contributionDate,
        description: `Aporte — ${dto.partnerName}${dto.reason ? `: ${dto.reason}` : ''}`,
        contributionId: row.id,
        createdByUserId: userId,
      });

      return row;
    });

    await this.audit.log(organizationId, 'contribution.create', 'capital_contribution', {
      userId,
      metadata: { contributionId: contribution.id, amount },
    });

    return contribution;
  }

  async listWithdrawals(organizationId: string) {
    return this.prisma.partnerWithdrawal.findMany({
      where: { organizationId },
      include: { fromAccount: { select: { id: true, name: true } } },
      orderBy: { withdrawalDate: 'desc' },
    });
  }

  async createWithdrawal(
    organizationId: string,
    dto: CreateWithdrawalDto,
    userId?: string,
  ) {
    await this.accounts.findAccount(organizationId, dto.fromAccountId);
    const amount = this.ledger.roundMoney(dto.amount);

    const withdrawal = await this.prisma.$transaction(async (tx) => {
      const row = await tx.partnerWithdrawal.create({
        data: {
          organizationId,
          partnerName: dto.partnerName.trim(),
          fromAccountId: dto.fromAccountId,
          amount: new Prisma.Decimal(amount),
          withdrawalDate: new Date(dto.withdrawalDate),
          withdrawalType: dto.withdrawalType,
          reason: dto.reason ?? null,
          createdByUserId: userId ?? null,
        },
      });

      await this.ledger.post(tx, {
        organizationId,
        accountId: dto.fromAccountId,
        direction: 'DEBIT',
        amount,
        movementKind: 'WITHDRAWAL',
        movementDate: dto.withdrawalDate,
        description: `Retirada — ${dto.partnerName} (${dto.withdrawalType})`,
        withdrawalId: row.id,
        createdByUserId: userId,
      });

      return row;
    });

    await this.audit.log(organizationId, 'withdrawal.create', 'partner_withdrawal', {
      userId,
      metadata: { withdrawalId: withdrawal.id, amount, type: dto.withdrawalType },
    });

    return withdrawal;
  }

  async reverseTransfer(organizationId: string, id: string, userId?: string) {
    const transfer = await this.prisma.financialTransfer.findFirst({
      where: { id, organizationId, status: 'COMPLETED' },
    });
    if (!transfer) throw new NotFoundException('Transferência não encontrada');

    const amount = this.ledger.roundMoney(Number(transfer.amount));

    await this.prisma.$transaction(async (tx) => {
      await this.ledger.post(tx, {
        organizationId,
        accountId: transfer.toAccountId,
        direction: 'DEBIT',
        amount,
        movementKind: 'TRANSFER_OUT',
        movementDate: new Date(),
        description: `Estorno transferência`,
        transferId: transfer.id,
        createdByUserId: userId,
      });

      await this.ledger.post(tx, {
        organizationId,
        accountId: transfer.fromAccountId,
        direction: 'CREDIT',
        amount,
        movementKind: 'TRANSFER_IN',
        movementDate: new Date(),
        description: `Estorno transferência`,
        transferId: transfer.id,
        createdByUserId: userId,
      });

      await tx.financialTransfer.update({
        where: { id },
        data: { status: 'REVERSED' },
      });
    });

    return { ok: true };
  }
}
