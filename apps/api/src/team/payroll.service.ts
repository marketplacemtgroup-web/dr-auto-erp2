import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamActionLogService } from './team-action-log.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionLog: TeamActionLogService,
  ) {}

  list(
    organizationId: string,
    filters?: {
      periodStart?: string;
      periodEnd?: string;
      employeeId?: string;
      status?: string;
    },
  ) {
    return this.prisma.payroll.findMany({
      where: {
        organizationId,
        ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.periodStart
          ? { periodStart: { gte: new Date(filters.periodStart) } }
          : {}),
        ...(filters?.periodEnd
          ? { periodEnd: { lte: new Date(filters.periodEnd) } }
          : {}),
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            jobTitle: true,
            paymentConfig: true,
          },
        },
        _count: { select: { items: true, commissions: true } },
      },
      orderBy: [{ periodStart: 'desc' }, { employee: { name: 'asc' } }],
    });
  }

  async findOne(organizationId: string, id: string) {
    const row = await this.prisma.payroll.findFirst({
      where: { id, organizationId },
      include: {
        employee: {
          include: { paymentConfig: true, jobTitle: true },
        },
        items: { orderBy: { createdAt: 'asc' } },
        commissions: {
          include: { serviceOrder: { select: { number: true } } },
        },
        entries: true,
      },
    });
    if (!row) throw new NotFoundException('Fechamento não encontrado');
    return row;
  }

  async buildPreview(
    organizationId: string,
    employeeId: string,
    periodStart: string,
    periodEnd: string,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      include: { paymentConfig: true },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    const [commissions, entries] = await Promise.all([
      this.prisma.generatedCommission.findMany({
        where: {
          organizationId,
          employeeId,
          status: { in: ['PENDENTE', 'APROVADA'] },
          generatedAt: { gte: start, lte: end },
          payrollId: null,
        },
        include: { serviceOrder: { select: { number: true } } },
      }),
      this.prisma.employeeEntry.findMany({
        where: {
          organizationId,
          employeeId,
          status: 'PENDENTE',
          entryDate: { gte: start, lte: end },
          payrollId: null,
        },
      }),
    ]);

    const fixedSalary = Number(employee.paymentConfig?.fixedSalary ?? 0);
    const totalCommissions = commissions.reduce(
      (s, c) => s + Number(c.commissionAmount),
      0,
    );

    const bonus = entries
      .filter((e) => ['BONUS', 'AJUSTE_POSITIVO', 'DIARIA', 'AJUDA_CUSTO'].includes(e.entryType))
      .reduce((s, e) => s + Number(e.amount), 0);

    const advances = entries
      .filter((e) => ['VALE', 'ADIANTAMENTO'].includes(e.entryType))
      .reduce((s, e) => s + Number(e.amount), 0);

    const discounts = entries
      .filter((e) => ['DESCONTO', 'AJUSTE_NEGATIVO'].includes(e.entryType))
      .reduce((s, e) => s + Number(e.amount), 0);

    const netTotal = fixedSalary + totalCommissions + bonus - advances - discounts;

    return {
      employee,
      periodStart,
      periodEnd,
      fixedSalary,
      totalCommissions,
      totalBonus: bonus,
      totalAdvances: advances,
      totalDiscounts: discounts,
      netTotal,
      commissions,
      entries,
    };
  }

  async create(
    organizationId: string,
    dto: CreatePayrollDto,
    userId?: string,
  ) {
    const preview = await this.buildPreview(
      organizationId,
      dto.employeeId,
      dto.periodStart,
      dto.periodEnd,
    );

    const existing = await this.prisma.payroll.findFirst({
      where: {
        organizationId,
        employeeId: dto.employeeId,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        status: { not: 'CANCELADA' },
      },
    });
    if (existing) {
      throw new BadRequestException('Já existe fechamento para este período');
    }

    const payroll = await this.prisma.$transaction(async (tx) => {
      const row = await tx.payroll.create({
        data: {
          organizationId,
          employeeId: dto.employeeId,
          periodStart: new Date(dto.periodStart),
          periodEnd: new Date(dto.periodEnd),
          fixedSalary: preview.fixedSalary,
          totalCommissions: preview.totalCommissions,
          totalBonus: preview.totalBonus,
          totalAdvances: preview.totalAdvances,
          totalDiscounts: preview.totalDiscounts,
          netTotal: preview.netTotal,
          status: 'ABERTA',
          notes: dto.notes ?? null,
        },
      });

      const items: Array<{
        payrollId: string;
        itemType: 'SALARIO' | 'COMISSAO' | 'BONUS' | 'VALE' | 'ADIANTAMENTO' | 'DESCONTO';
        description: string;
        amount: number;
        referenceId?: string;
      }> = [];

      if (preview.fixedSalary > 0) {
        items.push({
          payrollId: row.id,
          itemType: 'SALARIO',
          description: 'Salário fixo',
          amount: preview.fixedSalary,
        });
      }

      for (const c of preview.commissions) {
        items.push({
          payrollId: row.id,
          itemType: 'COMISSAO',
          description: c.description,
          amount: Number(c.commissionAmount),
          referenceId: c.id,
        });
        await tx.generatedCommission.update({
          where: { id: c.id },
          data: { payrollId: row.id, status: 'APROVADA' },
        });
      }

      for (const e of preview.entries) {
        const typeMap: Record<string, 'BONUS' | 'VALE' | 'ADIANTAMENTO' | 'DESCONTO'> = {
          BONUS: 'BONUS',
          AJUSTE_POSITIVO: 'BONUS',
          DIARIA: 'BONUS',
          AJUDA_CUSTO: 'BONUS',
          VALE: 'VALE',
          ADIANTAMENTO: 'ADIANTAMENTO',
          DESCONTO: 'DESCONTO',
          AJUSTE_NEGATIVO: 'DESCONTO',
        };
        const itemType = typeMap[e.entryType];
        if (!itemType) continue;
        items.push({
          payrollId: row.id,
          itemType,
          description: e.description,
          amount: Number(e.amount),
          referenceId: e.id,
        });
        await tx.employeeEntry.update({
          where: { id: e.id },
          data: { payrollId: row.id, status: 'APLICADO' },
        });
      }

      if (items.length) {
        await tx.payrollItem.createMany({ data: items });
      }

      return row;
    });

    await this.actionLog.log(organizationId, {
      userId,
      employeeId: dto.employeeId,
      module: 'payroll',
      action: 'payroll.create',
      entity: 'payroll',
      entityId: payroll.id,
      description: `Fechamento criado — R$ ${preview.netTotal}`,
    });

    return this.findOne(organizationId, payroll.id);
  }

  async close(organizationId: string, id: string, userId?: string) {
    const row = await this.findOne(organizationId, id);
    if (row.status !== 'ABERTA') {
      throw new BadRequestException('Fechamento não está aberto');
    }

    const updated = await this.prisma.payroll.update({
      where: { id },
      data: { status: 'FECHADA' },
    });

    await this.actionLog.log(organizationId, {
      userId,
      employeeId: row.employeeId,
      module: 'payroll',
      action: 'payroll.close',
      entity: 'payroll',
      entityId: id,
      description: 'Fechamento confirmado',
    });

    return updated;
  }

  async markPaid(
    organizationId: string,
    id: string,
    paymentMethod?: string,
    userId?: string,
  ) {
    const row = await this.findOne(organizationId, id);
    if (row.status === 'PAGA') {
      throw new BadRequestException('Pagamento já realizado');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payroll.update({
        where: { id },
        data: {
          status: 'PAGA',
          paidAt: new Date(),
          paymentMethod: (paymentMethod as never) ?? row.paymentMethod,
        },
      });
      await tx.generatedCommission.updateMany({
        where: { payrollId: id },
        data: { status: 'PAGA', paidAt: new Date() },
      });
      await tx.employeeEntry.updateMany({
        where: { payrollId: id },
        data: { status: 'PAGO' },
      });
    });

    await this.actionLog.log(organizationId, {
      userId,
      employeeId: row.employeeId,
      module: 'payroll',
      action: 'payroll.paid',
      entity: 'payroll',
      entityId: id,
      description: 'Pagamento marcado como pago',
    });

    return this.findOne(organizationId, id);
  }
}
