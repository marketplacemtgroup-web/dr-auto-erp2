import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import {
  CreateCostCenterDto,
  CreateFinancialAccountDto,
  UpdateFinancialAccountDto,
} from './dto/account.dto';
import { parseListQuery, paginatedResponse } from '../common/pagination';

const DEFAULT_COST_CENTERS = [
  'Oficina',
  'Administração',
  'Estoque',
  'Recepção',
  'Marketing',
  'Financeiro',
  'Outros',
];

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ledger: LedgerService,
  ) {}

  async ensurePrimaryAccount(organizationId: string) {
    const existing = await this.prisma.financialAccount.findFirst({
      where: { organizationId, isPrimary: true },
    });
    if (existing) return existing;

    return this.prisma.financialAccount.create({
      data: {
        organizationId,
        name: 'Caixa Principal',
        type: 'CAIXA',
        color: '#16A34A',
        isPrimary: true,
        allowsMovement: true,
      },
    });
  }

  async ensureDefaultCostCenters(organizationId: string) {
    for (const name of DEFAULT_COST_CENTERS) {
      const exists = await this.prisma.costCenter.findFirst({
        where: { organizationId, name },
      });
      if (!exists) {
        await this.prisma.costCenter.create({
          data: { organizationId, name, isSystem: true },
        });
      }
    }
  }

  async listAccounts(organizationId: string) {
    await this.ensurePrimaryAccount(organizationId);
    return this.prisma.financialAccount.findMany({
      where: { organizationId },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });
  }

  async findAccount(organizationId: string, id: string) {
    const account = await this.prisma.financialAccount.findFirst({
      where: { id, organizationId },
    });
    if (!account) throw new NotFoundException('Conta não encontrada');
    return account;
  }

  async createAccount(
    organizationId: string,
    dto: CreateFinancialAccountDto,
    userId?: string,
  ) {
    if (dto.isPrimary) {
      await this.prisma.financialAccount.updateMany({
        where: { organizationId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const opening = dto.openingBalance ?? 0;
    const account = await this.prisma.financialAccount.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        type: dto.type,
        bank: dto.bank ?? null,
        agency: dto.agency ?? null,
        accountNumber: dto.accountNumber ?? null,
        holder: dto.holder ?? null,
        openingBalance: new Prisma.Decimal(opening),
        currentBalance: new Prisma.Decimal(opening),
        color: dto.color ?? '#0E7490',
        icon: dto.icon ?? null,
        allowsMovement: dto.allowsMovement ?? true,
        isPrimary: dto.isPrimary ?? false,
      },
    });

    await this.audit.log(organizationId, 'account.create', 'financial_account', {
      userId,
      metadata: { accountId: account.id, name: account.name },
    });

    return account;
  }

  async updateAccount(
    organizationId: string,
    id: string,
    dto: UpdateFinancialAccountDto,
    userId?: string,
  ) {
    const existing = await this.findAccount(organizationId, id);

    if (dto.isPrimary) {
      await this.prisma.financialAccount.updateMany({
        where: { organizationId, isPrimary: true, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    const openingChanged =
      dto.openingBalance !== undefined &&
      dto.openingBalance !== Number(existing.openingBalance);

    const updated = await this.prisma.financialAccount.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.bank !== undefined ? { bank: dto.bank } : {}),
        ...(dto.agency !== undefined ? { agency: dto.agency } : {}),
        ...(dto.accountNumber !== undefined ? { accountNumber: dto.accountNumber } : {}),
        ...(dto.holder !== undefined ? { holder: dto.holder } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
        ...(dto.allowsMovement !== undefined
          ? { allowsMovement: dto.allowsMovement }
          : {}),
        ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.openingBalance !== undefined
          ? { openingBalance: new Prisma.Decimal(dto.openingBalance) }
          : {}),
      },
    });

    if (openingChanged) {
      await this.ledger.recomputeBalance(organizationId, id);
    }

    await this.audit.log(organizationId, 'account.update', 'financial_account', {
      userId,
      metadata: { accountId: id, changes: JSON.parse(JSON.stringify(dto)) },
    });

    return updated;
  }

  async getStatement(
    organizationId: string,
    accountId: string,
    from?: string,
    to?: string,
    query: { page?: string; limit?: string } = {},
  ) {
    await this.findAccount(organizationId, accountId);
    const { page, limit, skip } = parseListQuery(query);

    const where: Prisma.FinancialAccountMovementWhereInput = {
      organizationId,
      accountId,
      ...(from || to
        ? {
            movementDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [total, movements] = await Promise.all([
      this.prisma.financialAccountMovement.count({ where }),
      this.prisma.financialAccountMovement.findMany({
        where,
        orderBy: [{ movementDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return paginatedResponse(movements, total, page, limit);
  }

  async listCostCenters(organizationId: string) {
    await this.ensureDefaultCostCenters(organizationId);
    return this.prisma.costCenter.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCostCenter(organizationId: string, dto: CreateCostCenterDto) {
    const exists = await this.prisma.costCenter.findFirst({
      where: { organizationId, name: dto.name.trim() },
    });
    if (exists) throw new BadRequestException('Centro de custo já existe');

    return this.prisma.costCenter.create({
      data: {
        organizationId,
        name: dto.name.trim(),
      },
    });
  }

  async getBalancesSummary(organizationId: string) {
    const accounts = await this.listAccounts(organizationId);
    const cashAccounts = accounts.filter((a) => a.type === 'CAIXA');
    const bankAccounts = accounts.filter((a) => a.type === 'BANCO');
    const total = accounts.reduce((s, a) => s + Number(a.currentBalance), 0);
    const cashTotal = cashAccounts.reduce((s, a) => s + Number(a.currentBalance), 0);
    const bankTotal = bankAccounts.reduce((s, a) => s + Number(a.currentBalance), 0);

    return {
      accounts,
      totalBalance: this.ledger.roundMoney(total),
      cashBalance: this.ledger.roundMoney(cashTotal),
      bankBalance: this.ledger.roundMoney(bankTotal),
    };
  }
}
