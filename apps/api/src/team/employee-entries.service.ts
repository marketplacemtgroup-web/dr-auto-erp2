import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamActionLogService } from './team-action-log.service';
import { CreateEmployeeEntryDto } from './dto/create-employee-entry.dto';

@Injectable()
export class EmployeeEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionLog: TeamActionLogService,
  ) {}

  list(
    organizationId: string,
    filters?: { employeeId?: string; entryType?: string; from?: string; to?: string },
  ) {
    return this.prisma.employeeEntry.findMany({
      where: {
        organizationId,
        ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
        ...(filters?.entryType
          ? { entryType: filters.entryType as never }
          : {}),
        ...(filters?.from || filters?.to
          ? {
              entryDate: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
      },
      include: {
        employee: { select: { id: true, name: true } },
      },
      orderBy: { entryDate: 'desc' },
    });
  }

  async create(
    organizationId: string,
    dto: CreateEmployeeEntryDto,
    userId?: string,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, organizationId },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');

    const row = await this.prisma.employeeEntry.create({
      data: {
        organizationId,
        employeeId: dto.employeeId,
        entryType: dto.entryType,
        description: dto.description.trim(),
        amount: dto.amount,
        entryDate: new Date(dto.entryDate),
        competence: dto.competence ? new Date(dto.competence) : null,
        paymentMethod: dto.paymentMethod ?? null,
        notes: dto.notes ?? null,
        createdByUserId: userId ?? null,
        status: 'PENDENTE',
      },
      include: { employee: { select: { id: true, name: true } } },
    });

    await this.actionLog.log(organizationId, {
      userId,
      employeeId: dto.employeeId,
      module: 'team',
      action: 'entry.create',
      entity: 'employee_entry',
      entityId: row.id,
      description: `${dto.entryType}: ${dto.description} — R$ ${dto.amount}`,
    });

    return row;
  }

  async cancel(organizationId: string, id: string, userId?: string) {
    const row = await this.prisma.employeeEntry.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Lançamento não encontrado');

    return this.prisma.employeeEntry.update({
      where: { id },
      data: { status: 'CANCELADO' },
    });
  }
}
