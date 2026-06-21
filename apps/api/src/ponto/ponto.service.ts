import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmployeeStatus,
  Prisma,
  ScheduleStatus,
  TimeClockEntryType,
  TimeClockOrigin,
  TimeClockStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeamActionLogService } from '../team/team-action-log.service';
import { AuthUser, EmployeeScopeService } from '../shared/employee-scope.service';
import {
  computeExpectedMinutes,
  computeWorkedMinutes,
  formatTimeHHmm,
  parseTimeOnDate,
  startOfDayUtc,
  toDateOnlyStr,
} from '../shared/time-clock.utils';
import { AjustePontoDto, BaterPontoDto } from './dto/ponto.dto';

@Injectable()
export class PontoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: EmployeeScopeService,
    private readonly actionLog: TeamActionLogService,
  ) {}

  private entryOrder: TimeClockEntryType[] = [
    TimeClockEntryType.ENTRADA,
    TimeClockEntryType.INTERVALO_INICIO,
    TimeClockEntryType.INTERVALO_FIM,
    TimeClockEntryType.SAIDA,
  ];

  private validateSequence(
    existing: TimeClockEntryType[],
    next: TimeClockEntryType,
  ) {
    const has = (t: TimeClockEntryType) => existing.includes(t);

    if (next === TimeClockEntryType.ENTRADA && has(TimeClockEntryType.ENTRADA)) {
      throw new BadRequestException('Entrada já registrada hoje. Solicite ajuste ao administrador.');
    }
    if (next === TimeClockEntryType.SAIDA && !has(TimeClockEntryType.ENTRADA)) {
      throw new BadRequestException('Não é possível registrar saída sem entrada.');
    }
    if (next === TimeClockEntryType.INTERVALO_INICIO && !has(TimeClockEntryType.ENTRADA)) {
      throw new BadRequestException('Registre a entrada antes do intervalo.');
    }
    if (next === TimeClockEntryType.INTERVALO_FIM && !has(TimeClockEntryType.INTERVALO_INICIO)) {
      throw new BadRequestException('Registre o início do intervalo antes de voltar.');
    }
    if (next === TimeClockEntryType.SAIDA && has(TimeClockEntryType.SAIDA)) {
      throw new BadRequestException('Saída já registrada hoje.');
    }
  }

  async recalculateDay(
    organizationId: string,
    employeeId: string,
    workDate: string,
  ) {
    const date = startOfDayUtc(workDate);
    const entries = await this.prisma.employeeTimeClockEntry.findMany({
      where: {
        organizationId,
        employeeId,
        entryDate: date,
        status: { in: [TimeClockStatus.VALIDO, TimeClockStatus.AJUSTADO, TimeClockStatus.PENDENTE] },
      },
      orderBy: { recordedAt: 'asc' },
    });

    const pick = (type: TimeClockEntryType) =>
      entries.find((e) => e.entryType === type)?.recordedAt ?? null;

    const clockIn = pick(TimeClockEntryType.ENTRADA);
    const breakStart = pick(TimeClockEntryType.INTERVALO_INICIO);
    const breakEnd = pick(TimeClockEntryType.INTERVALO_FIM);
    const clockOut = pick(TimeClockEntryType.SAIDA);

    const schedule = await this.prisma.employeeSchedule.findFirst({
      where: {
        organizationId,
        employeeId,
        scheduleDate: date,
        status: { not: ScheduleStatus.CANCELADA },
      },
    });

    const expectedMinutes = schedule
      ? computeExpectedMinutes(
          schedule.startTime,
          schedule.endTime,
          schedule.breakStart,
          schedule.breakEnd,
          workDate,
        )
      : 0;

    const workedMinutes = computeWorkedMinutes(clockIn, breakStart, breakEnd, clockOut);

    let lateMinutes = 0;
    let earlyLeaveMinutes = 0;
    let overtimeMinutes = 0;

    if (schedule?.startTime && clockIn) {
      const expectedIn = parseTimeOnDate(workDate, schedule.startTime);
      if (clockIn > expectedIn) {
        lateMinutes = Math.round((clockIn.getTime() - expectedIn.getTime()) / 60000);
      }
    }
    if (schedule?.endTime && clockOut) {
      const expectedOut = parseTimeOnDate(workDate, schedule.endTime);
      if (clockOut < expectedOut) {
        earlyLeaveMinutes = Math.round((expectedOut.getTime() - clockOut.getTime()) / 60000);
      }
    }
    if (expectedMinutes > 0 && workedMinutes > expectedMinutes) {
      overtimeMinutes = workedMinutes - expectedMinutes;
    }

    let status: TimeClockStatus = TimeClockStatus.PENDENTE;
    if (clockIn && clockOut) status = TimeClockStatus.VALIDO;
    else if (entries.some((e) => e.status === TimeClockStatus.PENDENTE)) {
      status = TimeClockStatus.PENDENTE;
    }

    return this.prisma.employeeTimeClockDay.upsert({
      where: {
        employeeId_workDate: { employeeId, workDate: date },
      },
      create: {
        organizationId,
        employeeId,
        workDate: date,
        scheduleId: schedule?.id ?? null,
        clockIn,
        breakStart,
        breakEnd,
        clockOut,
        workedMinutes,
        expectedMinutes,
        lateMinutes,
        overtimeMinutes,
        earlyLeaveMinutes,
        status,
      },
      update: {
        scheduleId: schedule?.id ?? null,
        clockIn,
        breakStart,
        breakEnd,
        clockOut,
        workedMinutes,
        expectedMinutes,
        lateMinutes,
        overtimeMinutes,
        earlyLeaveMinutes,
        status,
      },
      include: {
        employee: { include: { jobTitle: true } },
        schedule: true,
      },
    });
  }

  async bater(
    organizationId: string,
    user: AuthUser,
    dto: BaterPontoDto,
    ipAddress?: string,
  ) {
    const employeeId = await this.scope.resolveOwnOrRequestedEmployeeId(
      user,
      dto.employeeId,
      'ponto',
    );

    if (
      dto.employeeId &&
      dto.employeeId !== employeeId &&
      !this.scope.canViewAllPonto(user.permissions)
    ) {
      throw new ForbiddenException('Sem permissão para bater ponto de outro funcionário');
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');
    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('Funcionário inativo não pode bater ponto');
    }

    const today = toDateOnlyStr(new Date());
    const date = startOfDayUtc(today);

    const existingEntries = await this.prisma.employeeTimeClockEntry.findMany({
      where: {
        organizationId,
        employeeId,
        entryDate: date,
        status: { not: TimeClockStatus.CANCELADO },
      },
      select: { entryType: true },
    });

    this.validateSequence(
      existingEntries.map((e) => e.entryType),
      dto.entryType,
    );

    const now = new Date();
    const origin = dto.origin ?? TimeClockOrigin.WEB;

    if (origin !== TimeClockOrigin.MANUAL_ADMIN) {
      const canBater =
        user.permissions.includes('ponto.bater') ||
        this.scope.hasAdminScope(user.permissions);
      if (!canBater) throw new ForbiddenException('Sem permissão para registrar ponto');
    }

    const entry = await this.prisma.employeeTimeClockEntry.create({
      data: {
        organizationId,
        employeeId,
        userId: user.userId,
        entryDate: date,
        entryType: dto.entryType,
        recordedAt: now,
        origin,
        status: TimeClockStatus.VALIDO,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        addressApprox: dto.addressApprox ?? null,
        device: dto.device ?? null,
        ipAddress: ipAddress ?? null,
        selfieUrl: dto.selfieUrl ?? null,
        notes: dto.notes ?? null,
      },
    });

    const day = await this.recalculateDay(organizationId, employeeId, today);

    await this.actionLog.log(organizationId, {
      userId: user.userId,
      employeeId,
      module: 'ponto',
      action: 'bater',
      entity: 'EmployeeTimeClockEntry',
      entityId: entry.id,
      description: `Batida ${dto.entryType} registrada`,
      ipAddress,
      device: dto.device,
    });

    return { entry, day };
  }

  async getHoje(organizationId: string, user: AuthUser, date?: string) {
    const workDate = date ?? toDateOnlyStr(new Date());
    const canAll = this.scope.canViewAllPonto(user.permissions);

    const where: Prisma.EmployeeTimeClockDayWhereInput = {
      organizationId,
      workDate: startOfDayUtc(workDate),
    };

    if (!canAll) {
      const ownId = await this.scope.resolveEmployeeId(organizationId, user.memberId);
      if (!ownId) return [];
      where.employeeId = ownId;
    }

    return this.prisma.employeeTimeClockDay.findMany({
      where,
      include: {
        employee: { include: { jobTitle: true } },
        schedule: true,
      },
      orderBy: { employee: { name: 'asc' } },
    });
  }

  async getDashboard(organizationId: string, user: AuthUser, date?: string) {
    const workDate = date ?? toDateOnlyStr(new Date());
    const rows = await this.getHoje(organizationId, user, workDate);

    const now = new Date();
    const presentNow = rows.filter(
      (r) => r.clockIn && !r.clockOut && r.clockIn <= now,
    ).length;
    const entriesToday = rows.filter((r) => r.clockIn).length;
    const pendingExit = rows.filter((r) => r.clockIn && !r.clockOut).length;
    const lateToday = rows.filter((r) => r.lateMinutes > 0).length;
    const pendingAdjustments = rows.filter(
      (r) => r.status === TimeClockStatus.PENDENTE,
    ).length;
    const totalWorked = rows.reduce((s, r) => s + r.workedMinutes, 0);

    return {
      stats: {
        presentNow,
        entriesToday,
        pendingExit,
        lateToday,
        pendingAdjustments,
        totalWorkedMinutes: totalWorked,
      },
      rows: rows.map((r) => ({
        ...r,
        clockInFormatted: formatTimeHHmm(r.clockIn),
        breakStartFormatted: formatTimeHHmm(r.breakStart),
        breakEndFormatted: formatTimeHHmm(r.breakEnd),
        clockOutFormatted: formatTimeHHmm(r.clockOut),
      })),
    };
  }

  async getHistorico(
    organizationId: string,
    user: AuthUser,
    filters: {
      employeeId?: string;
      periodStart?: string;
      periodEnd?: string;
      status?: TimeClockStatus;
    },
  ) {
    const where: Prisma.EmployeeTimeClockDayWhereInput = { organizationId };

    if (!this.scope.canViewAllPonto(user.permissions)) {
      const ownId = await this.scope.resolveEmployeeId(organizationId, user.memberId);
      if (!ownId) return [];
      where.employeeId = ownId;
    } else if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.status) where.status = filters.status;
    if (filters.periodStart || filters.periodEnd) {
      where.workDate = {};
      if (filters.periodStart) where.workDate.gte = startOfDayUtc(filters.periodStart);
      if (filters.periodEnd) where.workDate.lte = startOfDayUtc(filters.periodEnd);
    }

    return this.prisma.employeeTimeClockDay.findMany({
      where,
      include: {
        employee: { include: { jobTitle: true } },
        schedule: true,
      },
      orderBy: [{ workDate: 'desc' }, { employee: { name: 'asc' } }],
    });
  }

  async getFuncionarioDetail(
    organizationId: string,
    user: AuthUser,
    employeeId: string,
    periodStart: string,
    periodEnd: string,
  ) {
    await this.scope.assertCanAccessEmployee(user, employeeId, 'ponto');

    const [days, entries] = await Promise.all([
      this.getHistorico(organizationId, user, { employeeId, periodStart, periodEnd }),
      this.prisma.employeeTimeClockEntry.findMany({
        where: {
          organizationId,
          employeeId,
          entryDate: {
            gte: startOfDayUtc(periodStart),
            lte: startOfDayUtc(periodEnd),
          },
        },
        orderBy: { recordedAt: 'asc' },
      }),
    ]);

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      include: { jobTitle: true },
    });

    return { employee, days, entries };
  }

  async ajuste(
    organizationId: string,
    user: AuthUser,
    dto: AjustePontoDto,
  ) {
    const canAdjust =
      user.permissions.includes('ponto.ajustar') ||
      this.scope.hasAdminScope(user.permissions);
    if (!canAdjust) throw new ForbiddenException('Sem permissão para ajustar ponto');

    await this.scope.requireActiveEmployee(organizationId, dto.employeeId);

    const date = startOfDayUtc(dto.workDate);
    const types: { field: keyof AjustePontoDto; type: TimeClockEntryType }[] = [
      { field: 'clockIn', type: TimeClockEntryType.ENTRADA },
      { field: 'breakStart', type: TimeClockEntryType.INTERVALO_INICIO },
      { field: 'breakEnd', type: TimeClockEntryType.INTERVALO_FIM },
      { field: 'clockOut', type: TimeClockEntryType.SAIDA },
    ];

    for (const { field, type } of types) {
      const val = dto[field];
      if (!val || typeof val !== 'string') continue;

      await this.prisma.employeeTimeClockEntry.deleteMany({
        where: {
          organizationId,
          employeeId: dto.employeeId,
          entryDate: date,
          entryType: type,
        },
      });

      await this.prisma.employeeTimeClockEntry.create({
        data: {
          organizationId,
          employeeId: dto.employeeId,
          userId: user.userId,
          entryDate: date,
          entryType: type,
          recordedAt: new Date(val),
          origin: TimeClockOrigin.MANUAL_ADMIN,
          status: TimeClockStatus.PENDENTE,
          notes: dto.notes ?? null,
          adjustedById: user.userId,
          adjustedAt: new Date(),
        },
      });
    }

    const day = await this.recalculateDay(organizationId, dto.employeeId, dto.workDate);
    if (day) {
      await this.prisma.employeeTimeClockDay.update({
        where: { id: day.id },
        data: { status: TimeClockStatus.PENDENTE, notes: dto.notes ?? day.notes },
      });
    }

    await this.actionLog.log(organizationId, {
      userId: user.userId,
      employeeId: dto.employeeId,
      module: 'ponto',
      action: 'ajuste',
      entity: 'EmployeeTimeClockDay',
      entityId: day?.id,
      description: `Ajuste manual de ponto em ${dto.workDate}`,
    });

    return this.recalculateDay(organizationId, dto.employeeId, dto.workDate);
  }

  async aprovarAjuste(organizationId: string, user: AuthUser, dayId: string) {
    const canApprove =
      user.permissions.includes('ponto.aprovar_ajuste') ||
      this.scope.hasAdminScope(user.permissions);
    if (!canApprove) throw new ForbiddenException('Sem permissão para aprovar ajuste');

    const day = await this.prisma.employeeTimeClockDay.findFirst({
      where: { id: dayId, organizationId },
    });
    if (!day) throw new NotFoundException('Registro não encontrado');

    await this.prisma.employeeTimeClockEntry.updateMany({
      where: {
        organizationId,
        employeeId: day.employeeId,
        entryDate: day.workDate,
        status: TimeClockStatus.PENDENTE,
      },
      data: {
        status: TimeClockStatus.AJUSTADO,
        adjustedById: user.userId,
        adjustedAt: new Date(),
      },
    });

    return this.prisma.employeeTimeClockDay.update({
      where: { id: dayId },
      data: { status: TimeClockStatus.AJUSTADO },
      include: { employee: true, schedule: true },
    });
  }

  async recusarAjuste(
    organizationId: string,
    user: AuthUser,
    dayId: string,
    reason?: string,
  ) {
    const canApprove =
      user.permissions.includes('ponto.aprovar_ajuste') ||
      this.scope.hasAdminScope(user.permissions);
    if (!canApprove) throw new ForbiddenException('Sem permissão para recusar ajuste');

    const day = await this.prisma.employeeTimeClockDay.findFirst({
      where: { id: dayId, organizationId },
    });
    if (!day) throw new NotFoundException('Registro não encontrado');

    await this.prisma.employeeTimeClockEntry.updateMany({
      where: {
        organizationId,
        employeeId: day.employeeId,
        entryDate: day.workDate,
        status: TimeClockStatus.PENDENTE,
      },
      data: { status: TimeClockStatus.RECUSADO },
    });

    return this.prisma.employeeTimeClockDay.update({
      where: { id: dayId },
      data: {
        status: TimeClockStatus.RECUSADO,
        notes: reason ?? day.notes,
      },
      include: { employee: true, schedule: true },
    });
  }

  async relatorio(
    organizationId: string,
    user: AuthUser,
    filters: {
      employeeId?: string;
      jobTitleId?: string;
      periodStart: string;
      periodEnd: string;
      status?: TimeClockStatus;
    },
  ) {
    const canExport =
      user.permissions.includes('ponto.exportar') ||
      this.scope.canViewAllPonto(user.permissions);
    if (!canExport) throw new ForbiddenException('Sem permissão para exportar relatório');

    const where: Prisma.EmployeeTimeClockDayWhereInput = {
      organizationId,
      workDate: {
        gte: startOfDayUtc(filters.periodStart),
        lte: startOfDayUtc(filters.periodEnd),
      },
    };
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.jobTitleId) {
      where.employee = { jobTitleId: filters.jobTitleId };
    }
    if (filters.status) where.status = filters.status;

    const rows = await this.prisma.employeeTimeClockDay.findMany({
      where,
      include: {
        employee: { include: { jobTitle: true } },
        schedule: true,
      },
      orderBy: [{ workDate: 'asc' }, { employee: { name: 'asc' } }],
    });

    return rows.map((r) => ({
      employee: r.employee,
      workDate: r.workDate,
      scheduleExpected: r.schedule
        ? `${r.schedule.startTime ?? '—'} - ${r.schedule.endTime ?? '—'}`
        : '—',
      clockIn: formatTimeHHmm(r.clockIn),
      break: r.breakStart
        ? `${formatTimeHHmm(r.breakStart)} - ${formatTimeHHmm(r.breakEnd)}`
        : '—',
      clockOut: formatTimeHHmm(r.clockOut),
      workedMinutes: r.workedMinutes,
      lateMinutes: r.lateMinutes,
      overtimeMinutes: r.overtimeMinutes,
      status: r.status,
    }));
  }

  async pendingAdjustments(organizationId: string, user: AuthUser) {
    if (!this.scope.canViewAllPonto(user.permissions)) {
      throw new ForbiddenException('Sem permissão para ver ajustes pendentes');
    }

    return this.prisma.employeeTimeClockDay.findMany({
      where: {
        organizationId,
        status: TimeClockStatus.PENDENTE,
      },
      include: {
        employee: { include: { jobTitle: true } },
        schedule: true,
      },
      orderBy: { workDate: 'desc' },
    });
  }
}
