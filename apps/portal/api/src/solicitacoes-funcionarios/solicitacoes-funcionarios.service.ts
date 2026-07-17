import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmployeeRequestStatus,
  EmployeeRequestType,
  EmployeeStatus,
  Prisma,
  ScheduleDayType,
  ScheduleStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeamActionLogService } from '../team/team-action-log.service';
import { EscalasService } from '../escalas/escalas.service';
import { PontoService } from '../ponto/ponto.service';
import { AuthUser, EmployeeScopeService } from '../shared/employee-scope.service';
import { dayOfWeekFromDate, startOfDayUtc, toDateOnlyStr } from '../shared/time-clock.utils';
import { CreateEmployeeRequestDto } from './dto/request.dto';

@Injectable()
export class SolicitacoesFuncionariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: EmployeeScopeService,
    private readonly actionLog: TeamActionLogService,
    private readonly escalas: EscalasService,
    private readonly ponto: PontoService,
  ) {}

  private include = {
    employee: { include: { jobTitle: true } },
  } satisfies Prisma.EmployeeRequestInclude;

  async list(
    organizationId: string,
    user: AuthUser,
    filters: {
      employeeId?: string;
      requestType?: EmployeeRequestType;
      status?: EmployeeRequestStatus;
      periodStart?: string;
      periodEnd?: string;
    },
  ) {
    const where: Prisma.EmployeeRequestWhereInput = { organizationId };

    if (!this.scope.canViewAllSolicitacoes(user.permissions)) {
      const ownId = await this.scope.resolveEmployeeId(organizationId, user.memberId);
      if (!ownId) return [];
      where.employeeId = ownId;
    } else if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.requestType) where.requestType = filters.requestType;
    if (filters.status) where.status = filters.status;
    if (filters.periodStart || filters.periodEnd) {
      where.referenceDate = {};
      if (filters.periodStart) {
        where.referenceDate.gte = startOfDayUtc(filters.periodStart);
      }
      if (filters.periodEnd) {
        where.referenceDate.lte = startOfDayUtc(filters.periodEnd);
      }
    }

    return this.prisma.employeeRequest.findMany({
      where,
      include: this.include,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, user: AuthUser, id: string) {
    const req = await this.prisma.employeeRequest.findFirst({
      where: { id, organizationId },
      include: this.include,
    });
    if (!req) throw new NotFoundException('Solicitação não encontrada');
    await this.scope.assertCanAccessEmployee(user, req.employeeId, 'solicitacoes');
    return req;
  }

  async create(
    organizationId: string,
    user: AuthUser,
    dto: CreateEmployeeRequestDto,
  ) {
    const canCreate =
      user.permissions.includes('solicitacoes.criar') ||
      this.scope.hasAdminScope(user.permissions);
    if (!canCreate) throw new ForbiddenException('Sem permissão para criar solicitação');

    const employeeId = await this.scope.resolveOwnOrRequestedEmployeeId(
      user,
      dto.employeeId,
      'solicitacoes',
    );

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');
    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('Funcionário inativo não pode criar solicitação');
    }

    const request = await this.prisma.employeeRequest.create({
      data: {
        organizationId,
        employeeId,
        requestType: dto.requestType,
        referenceDate: startOfDayUtc(dto.referenceDate),
        description: dto.description,
        attachmentUrl: dto.attachmentUrl ?? null,
        metadata: dto.metadata as Prisma.InputJsonValue,
        status: EmployeeRequestStatus.ENVIADA,
      },
      include: this.include,
    });

    await this.actionLog.log(organizationId, {
      userId: user.userId,
      employeeId,
      module: 'solicitacoes',
      action: 'create',
      entity: 'EmployeeRequest',
      entityId: request.id,
      description: `Solicitação ${dto.requestType} criada`,
    });

    return request;
  }

  private async applyApprovalSideEffects(
    organizationId: string,
    user: AuthUser,
    request: {
      id: string;
      employeeId: string;
      requestType: EmployeeRequestType;
      referenceDate: Date;
      description: string;
      metadata: unknown;
    },
  ) {
    const dateStr = toDateOnlyStr(request.referenceDate);
    const meta = (request.metadata ?? {}) as Record<string, unknown>;

    if (request.requestType === EmployeeRequestType.FOLGA) {
      await this.escalas.create(organizationId, user, {
        employeeId: request.employeeId,
        scheduleDate: dateStr,
        dayOfWeek: dayOfWeekFromDate(dateStr),
        dayType: ScheduleDayType.FOLGA,
        status: ScheduleStatus.CONFIRMADA,
        notes: request.description,
        isException: true,
      });
    }

    if (request.requestType === EmployeeRequestType.TROCA_ESCALA) {
      const startTime = meta.startTime as string | undefined;
      const endTime = meta.endTime as string | undefined;
      await this.escalas.create(organizationId, user, {
        employeeId: request.employeeId,
        scheduleDate: dateStr,
        dayOfWeek: dayOfWeekFromDate(dateStr),
        dayType: ScheduleDayType.TRABALHO,
        startTime,
        endTime,
        breakStart: meta.breakStart as string | undefined,
        breakEnd: meta.breakEnd as string | undefined,
        status: ScheduleStatus.CONFIRMADA,
        notes: request.description,
        isException: true,
      });
    }

    if (request.requestType === EmployeeRequestType.AJUSTE_PONTO) {
      await this.ponto.ajuste(organizationId, user, {
        employeeId: request.employeeId,
        workDate: dateStr,
        clockIn: meta.clockIn as string | undefined,
        breakStart: meta.breakStart as string | undefined,
        breakEnd: meta.breakEnd as string | undefined,
        clockOut: meta.clockOut as string | undefined,
        notes: request.description,
      });
    }
  }

  async aprovar(organizationId: string, user: AuthUser, id: string) {
    const canApprove =
      user.permissions.includes('solicitacoes.aprovar') ||
      this.scope.hasAdminScope(user.permissions);
    if (!canApprove) throw new ForbiddenException('Sem permissão para aprovar');

    const req = await this.findOne(organizationId, user, id);
    if (
      req.status === EmployeeRequestStatus.APROVADA ||
      req.status === EmployeeRequestStatus.CANCELADA
    ) {
      throw new BadRequestException('Solicitação já finalizada');
    }

    const updated = await this.prisma.employeeRequest.update({
      where: { id },
      data: {
        status: EmployeeRequestStatus.APROVADA,
        approvedById: user.userId,
        approvedAt: new Date(),
      },
      include: this.include,
    });

    await this.applyApprovalSideEffects(organizationId, user, req);

    await this.actionLog.log(organizationId, {
      userId: user.userId,
      employeeId: req.employeeId,
      module: 'solicitacoes',
      action: 'approve',
      entity: 'EmployeeRequest',
      entityId: id,
      description: `Solicitação aprovada`,
    });

    return updated;
  }

  async recusar(
    organizationId: string,
    user: AuthUser,
    id: string,
    reason: string,
  ) {
    const canReject =
      user.permissions.includes('solicitacoes.recusar') ||
      this.scope.hasAdminScope(user.permissions);
    if (!canReject) throw new ForbiddenException('Sem permissão para recusar');

    const req = await this.findOne(organizationId, user, id);
    if (req.status === EmployeeRequestStatus.CANCELADA) {
      throw new BadRequestException('Solicitação cancelada');
    }

    return this.prisma.employeeRequest.update({
      where: { id },
      data: {
        status: EmployeeRequestStatus.RECUSADA,
        approvedById: user.userId,
        approvedAt: new Date(),
        rejectionReason: reason,
      },
      include: this.include,
    });
  }

  async cancelar(organizationId: string, user: AuthUser, id: string) {
    const req = await this.findOne(organizationId, user, id);

    const canManage =
      this.scope.canViewAllSolicitacoes(user.permissions) ||
      (await this.scope.resolveEmployeeId(organizationId, user.memberId)) === req.employeeId;

    if (!canManage) throw new ForbiddenException('Sem permissão para cancelar');

    if (req.status !== EmployeeRequestStatus.ENVIADA && req.status !== EmployeeRequestStatus.EM_ANALISE) {
      throw new BadRequestException('Solicitação não pode ser cancelada neste status');
    }

    return this.prisma.employeeRequest.update({
      where: { id },
      data: { status: EmployeeRequestStatus.CANCELADA },
      include: this.include,
    });
  }
}
