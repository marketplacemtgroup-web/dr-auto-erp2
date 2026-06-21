import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmployeeStatus,
  Prisma,
  ScheduleDayType,
  ScheduleStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeamActionLogService } from '../team/team-action-log.service';
import { AuthUser, EmployeeScopeService } from '../shared/employee-scope.service';
import {
  dayOfWeekFromDate,
  eachDateInRange,
  startOfDayUtc,
  toDateOnlyStr,
} from '../shared/time-clock.utils';
import {
  CreateScheduleDto,
  CreateScheduleRecurrenceDto,
  UpdateScheduleDto,
} from './dto/schedule.dto';

const scheduleInclude = {
  employee: { include: { jobTitle: true } },
  recurrence: true,
} satisfies Prisma.EmployeeScheduleInclude;

@Injectable()
export class EscalasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: EmployeeScopeService,
    private readonly actionLog: TeamActionLogService,
  ) {}

  private async ensureActiveEmployee(organizationId: string, employeeId: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });
    if (!emp) throw new NotFoundException('Funcionário não encontrado');
    if (emp.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('Não é possível criar escala para funcionário inativo');
    }
    return emp;
  }

  private async logHistory(
    organizationId: string,
    scheduleId: string,
    employeeId: string,
    userId: string | undefined,
    action: string,
    previousData: unknown,
    newData: unknown,
  ) {
    await this.prisma.employeeScheduleHistory.create({
      data: {
        organizationId,
        scheduleId,
        employeeId,
        changedById: userId ?? null,
        action,
        previousData: previousData as Prisma.InputJsonValue,
        newData: newData as Prisma.InputJsonValue,
      },
    });
  }

  async getStats(organizationId: string, date?: string) {
    const today = date ?? toDateOnlyStr(new Date());
    const weekStart = new Date(`${today}T12:00:00.000Z`);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const weekStartStr = toDateOnlyStr(weekStart);
    const weekEndStr = toDateOnlyStr(weekEnd);

    const [todaySchedules, weekPlantao, pendingConfirm] = await Promise.all([
      this.prisma.employeeSchedule.findMany({
        where: {
          organizationId,
          scheduleDate: startOfDayUtc(today),
          status: { not: ScheduleStatus.CANCELADA },
        },
        include: { employee: { include: { jobTitle: true } } },
      }),
      this.prisma.employeeSchedule.count({
        where: {
          organizationId,
          scheduleDate: { gte: startOfDayUtc(weekStartStr), lte: startOfDayUtc(weekEndStr) },
          dayType: ScheduleDayType.PLANTAO,
          status: { not: ScheduleStatus.CANCELADA },
        },
      }),
      this.prisma.employeeSchedule.count({
        where: {
          organizationId,
          status: ScheduleStatus.PLANEJADA,
          scheduleDate: { gte: startOfDayUtc(today) },
        },
      }),
    ]);

    const workingToday = todaySchedules.filter(
      (s) => s.dayType === ScheduleDayType.TRABALHO || s.dayType === ScheduleDayType.PLANTAO,
    ).length;
    const offToday = todaySchedules.filter(
      (s) => s.dayType === ScheduleDayType.FOLGA || s.dayType === ScheduleDayType.FERIADO,
    ).length;

    return {
      workingToday,
      offToday,
      weekPlantao,
      pendingConfirm,
    };
  }

  async list(
    organizationId: string,
    user: AuthUser,
    filters: {
      employeeId?: string;
      jobTitleId?: string;
      periodStart?: string;
      periodEnd?: string;
      dayType?: ScheduleDayType;
      status?: ScheduleStatus;
    },
  ) {
    const where: Prisma.EmployeeScheduleWhereInput = { organizationId };

    if (!this.scope.canViewAllEscalas(user.permissions)) {
      const ownId = await this.scope.resolveEmployeeId(organizationId, user.memberId);
      if (!ownId) return [];
      where.employeeId = ownId;
    } else if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.jobTitleId) {
      where.employee = { jobTitleId: filters.jobTitleId };
    }
    if (filters.dayType) where.dayType = filters.dayType;
    if (filters.status) where.status = filters.status;
    if (filters.periodStart || filters.periodEnd) {
      where.scheduleDate = {};
      if (filters.periodStart) {
        where.scheduleDate.gte = startOfDayUtc(filters.periodStart);
      }
      if (filters.periodEnd) {
        where.scheduleDate.lte = startOfDayUtc(filters.periodEnd);
      }
    }

    return this.prisma.employeeSchedule.findMany({
      where,
      include: scheduleInclude,
      orderBy: [{ scheduleDate: 'asc' }, { employee: { name: 'asc' } }],
    });
  }

  async findOne(organizationId: string, user: AuthUser, id: string) {
    const schedule = await this.prisma.employeeSchedule.findFirst({
      where: { id, organizationId },
      include: {
        ...scheduleInclude,
        histories: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!schedule) throw new NotFoundException('Escala não encontrada');
    await this.scope.assertCanAccessEmployee(user, schedule.employeeId, 'escalas');
    return schedule;
  }

  async create(organizationId: string, user: AuthUser, dto: CreateScheduleDto) {
    await this.ensureActiveEmployee(organizationId, dto.employeeId);

    if (dto.isRecurring && dto.daysOfWeek?.length && dto.periodStart) {
      return this.createRecurrence(organizationId, user, {
        employeeId: dto.employeeId,
        daysOfWeek: dto.daysOfWeek,
        dayType: dto.dayType,
        startTime: dto.startTime,
        endTime: dto.endTime,
        breakStart: dto.breakStart,
        breakEnd: dto.breakEnd,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
      });
    }

    if (!dto.scheduleDate) {
      throw new BadRequestException('Informe a data da escala ou configure recorrência');
    }

    await this.checkConflict(organizationId, dto.employeeId, dto.scheduleDate, dto.dayType);

    const schedule = await this.prisma.employeeSchedule.create({
      data: {
        organizationId,
        employeeId: dto.employeeId,
        scheduleDate: startOfDayUtc(dto.scheduleDate),
        dayOfWeek: dto.dayOfWeek ?? dayOfWeekFromDate(dto.scheduleDate),
        dayType: dto.dayType,
        startTime: dto.startTime ?? null,
        endTime: dto.endTime ?? null,
        breakStart: dto.breakStart ?? null,
        breakEnd: dto.breakEnd ?? null,
        isRecurring: false,
        isException: dto.isException ?? false,
        status: dto.status ?? ScheduleStatus.PLANEJADA,
        notes: dto.notes ?? null,
        createdById: user.userId,
        updatedById: user.userId,
      },
      include: scheduleInclude,
    });

    await this.logHistory(
      organizationId,
      schedule.id,
      dto.employeeId,
      user.userId,
      'CREATE',
      null,
      schedule,
    );
    await this.actionLog.log(organizationId, {
      userId: user.userId,
      employeeId: dto.employeeId,
      module: 'escalas',
      action: 'create',
      entity: 'EmployeeSchedule',
      entityId: schedule.id,
      description: `Escala criada para ${dto.scheduleDate}`,
    });

    return schedule;
  }

  private async checkConflict(
    organizationId: string,
    employeeId: string,
    scheduleDate: string,
    dayType: ScheduleDayType,
  ) {
    if (dayType === ScheduleDayType.FOLGA || dayType === ScheduleDayType.AFASTADO) return;

    const existing = await this.prisma.employeeSchedule.findFirst({
      where: {
        organizationId,
        employeeId,
        scheduleDate: startOfDayUtc(scheduleDate),
        status: { not: ScheduleStatus.CANCELADA },
        dayType: { in: [ScheduleDayType.TRABALHO, ScheduleDayType.PLANTAO] },
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Já existe escala de trabalho/plantão para este funcionário nesta data. Cancele ou edite a existente.',
      );
    }
  }

  async createRecurrence(
    organizationId: string,
    user: AuthUser,
    dto: CreateScheduleRecurrenceDto,
  ) {
    await this.ensureActiveEmployee(organizationId, dto.employeeId);

    const recurrence = await this.prisma.employeeScheduleRecurrence.create({
      data: {
        organizationId,
        employeeId: dto.employeeId,
        name: dto.name ?? null,
        daysOfWeek: dto.daysOfWeek,
        dayType: dto.dayType,
        startTime: dto.startTime ?? null,
        endTime: dto.endTime ?? null,
        breakStart: dto.breakStart ?? null,
        breakEnd: dto.breakEnd ?? null,
        periodStart: startOfDayUtc(dto.periodStart),
        periodEnd: dto.periodEnd ? startOfDayUtc(dto.periodEnd) : null,
        createdById: user.userId,
        updatedById: user.userId,
      },
    });

    const endDate =
      dto.periodEnd ??
      toDateOnlyStr(new Date(Date.now() + 90 * 86400000));
    const dates = eachDateInRange(dto.periodStart, endDate);
    const created: string[] = [];

    for (const dateStr of dates) {
      const dow = dayOfWeekFromDate(dateStr);
      if (!dto.daysOfWeek.includes(dow)) continue;

      const existing = await this.prisma.employeeSchedule.findUnique({
        where: {
          employeeId_scheduleDate: {
            employeeId: dto.employeeId,
            scheduleDate: startOfDayUtc(dateStr),
          },
        },
      });
      if (existing) continue;

      const schedule = await this.prisma.employeeSchedule.create({
        data: {
          organizationId,
          employeeId: dto.employeeId,
          scheduleDate: startOfDayUtc(dateStr),
          dayOfWeek: dow,
          dayType: dto.dayType,
          startTime: dto.startTime ?? null,
          endTime: dto.endTime ?? null,
          breakStart: dto.breakStart ?? null,
          breakEnd: dto.breakEnd ?? null,
          isRecurring: true,
          recurrenceId: recurrence.id,
          status: ScheduleStatus.PLANEJADA,
          createdById: user.userId,
          updatedById: user.userId,
        },
      });
      created.push(schedule.id);
    }

    await this.actionLog.log(organizationId, {
      userId: user.userId,
      employeeId: dto.employeeId,
      module: 'escalas',
      action: 'create_recurrence',
      entity: 'EmployeeScheduleRecurrence',
      entityId: recurrence.id,
      description: `Recorrência criada com ${created.length} escalas`,
    });

    return { recurrence, schedulesCreated: created.length };
  }

  async update(
    organizationId: string,
    user: AuthUser,
    id: string,
    dto: UpdateScheduleDto,
  ) {
    const existing = await this.findOne(organizationId, user, id);

    const updated = await this.prisma.employeeSchedule.update({
      where: { id },
      data: {
        ...dto,
        status: dto.status ?? (existing.status === ScheduleStatus.PLANEJADA ? ScheduleStatus.ALTERADA : existing.status),
        updatedById: user.userId,
      },
      include: scheduleInclude,
    });

    await this.logHistory(
      organizationId,
      id,
      existing.employeeId,
      user.userId,
      'UPDATE',
      existing,
      updated,
    );

    return updated;
  }

  async cancel(organizationId: string, user: AuthUser, id: string) {
    return this.update(organizationId, user, id, { status: ScheduleStatus.CANCELADA });
  }

  async byEmployee(
    organizationId: string,
    user: AuthUser,
    employeeId: string,
    periodStart?: string,
    periodEnd?: string,
  ) {
    await this.scope.assertCanAccessEmployee(user, employeeId, 'escalas');
    return this.list(organizationId, user, {
      employeeId,
      periodStart,
      periodEnd,
    });
  }

  async minhaEscala(
    organizationId: string,
    user: AuthUser,
    periodStart?: string,
    periodEnd?: string,
  ) {
    const employeeId = await this.scope.resolveOwnOrRequestedEmployeeId(
      user,
      undefined,
      'escalas',
    );
    return this.byEmployee(organizationId, user, employeeId, periodStart, periodEnd);
  }

  async report(
    organizationId: string,
    user: AuthUser,
    filters: { employeeId?: string; periodStart: string; periodEnd: string },
  ) {
    const schedules = await this.list(organizationId, user, {
      ...filters,
      status: undefined,
    });

    const byEmployee = new Map<
      string,
      {
        employee: (typeof schedules)[0]['employee'];
        workDays: number;
        offDays: number;
        plantaoDays: number;
        expectedMinutes: number;
      }
    >();

    for (const s of schedules) {
      if (s.status === ScheduleStatus.CANCELADA) continue;
      let row = byEmployee.get(s.employeeId);
      if (!row) {
        row = {
          employee: s.employee,
          workDays: 0,
          offDays: 0,
          plantaoDays: 0,
          expectedMinutes: 0,
        };
        byEmployee.set(s.employeeId, row);
      }
      const dateStr = toDateOnlyStr(s.scheduleDate);
      if (s.dayType === ScheduleDayType.FOLGA || s.dayType === ScheduleDayType.FERIADO) {
        row.offDays++;
      } else if (s.dayType === ScheduleDayType.PLANTAO) {
        row.plantaoDays++;
        if (s.startTime && s.endTime) {
          const [sh, sm] = s.startTime.split(':').map(Number);
          const [eh, em] = s.endTime.split(':').map(Number);
          row.expectedMinutes += eh * 60 + em - (sh * 60 + sm);
        }
      } else if (s.dayType === ScheduleDayType.TRABALHO) {
        row.workDays++;
        if (s.startTime && s.endTime) {
          const [sh, sm] = s.startTime.split(':').map(Number);
          const [eh, em] = s.endTime.split(':').map(Number);
          let mins = eh * 60 + em - (sh * 60 + sm);
          if (s.breakStart && s.breakEnd) {
            const [bsh, bsm] = s.breakStart.split(':').map(Number);
            const [beh, bem] = s.breakEnd.split(':').map(Number);
            mins -= beh * 60 + bem - (bsh * 60 + bsm);
          }
          row.expectedMinutes += Math.max(0, mins);
        }
      }
    }

    return Array.from(byEmployee.values());
  }
}
