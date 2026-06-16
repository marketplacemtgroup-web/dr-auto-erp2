import { Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeamActionLogService } from './team-action-log.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeePaymentConfigDto } from './dto/employee-payment-config.dto';
import { ensureDefaultJobTitles } from './default-job-titles';
import { EmployeeAccessService } from './employee-access.service';

const employeeInclude = {
  jobTitle: true,
  paymentConfig: true,
  member: { include: { user: true, role: true } },
  _count: {
    select: {
      generatedCommissions: true,
      executedItems: true,
    },
  },
} satisfies Prisma.EmployeeInclude;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionLog: TeamActionLogService,
    private readonly access: EmployeeAccessService,
  ) {}

  async ensureDefaultJobTitles(organizationId: string) {
    return ensureDefaultJobTitles(this.prisma, organizationId);
  }

  async listStats(organizationId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [activeCount, pendingCommissions, monthPayrolls, osInProgress] =
      await Promise.all([
        this.prisma.employee.count({
          where: { organizationId, status: 'ACTIVE' },
        }),
        this.prisma.generatedCommission.aggregate({
          where: { organizationId, status: 'PENDENTE' },
          _sum: { commissionAmount: true },
        }),
        this.prisma.payroll.aggregate({
          where: {
            organizationId,
            periodStart: { gte: monthStart },
            periodEnd: { lte: monthEnd },
            status: { in: ['FECHADA', 'PAGA'] },
          },
          _sum: { netTotal: true },
        }),
        this.prisma.serviceOrder.count({
          where: {
            organizationId,
            deletedAt: null,
            status: { in: ['IN_PROGRESS', 'APPROVED', 'AWAITING_PART', 'PAUSED'] },
          },
        }),
      ]);

    return {
      activeEmployees: activeCount,
      pendingCommissions: Number(pendingCommissions._sum.commissionAmount ?? 0),
      monthPayments: Number(monthPayrolls._sum.netTotal ?? 0),
      osInProgress,
    };
  }

  async list(
    organizationId: string,
    filters?: {
      status?: EmployeeStatus;
      jobTitleId?: string;
      employeeId?: string;
      search?: string;
    },
  ) {
    await this.ensureDefaultJobTitles(organizationId);

    const employees = await this.prisma.employee.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.jobTitleId ? { jobTitleId: filters.jobTitleId } : {}),
        ...(filters?.employeeId ? { id: filters.employeeId } : {}),
        ...(filters?.search
          ? { name: { contains: filters.search, mode: 'insensitive' } }
          : {}),
      },
      include: employeeInclude,
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return Promise.all(
      employees.map(async (emp) => {
        const [pendingPay, osCount, monthTotal] = await Promise.all([
          this.prisma.generatedCommission.aggregate({
            where: { employeeId: emp.id, status: 'PENDENTE' },
            _sum: { commissionAmount: true },
          }),
          this.prisma.serviceOrder.count({
            where: {
              organizationId,
              deletedAt: null,
              status: { in: ['IN_PROGRESS', 'APPROVED', 'AWAITING_PART'] },
              OR: [
                { executionById: emp.id },
                { generalResponsibleId: emp.id },
                { items: { some: { executorId: emp.id } } },
              ],
            },
          }),
          this.prisma.payroll.findFirst({
            where: {
              employeeId: emp.id,
              periodStart: { gte: monthStart },
              periodEnd: { lte: monthEnd },
            },
            orderBy: { createdAt: 'desc' },
          }),
        ]);

        const fixedSalary = Number(emp.paymentConfig?.fixedSalary ?? 0);
        const pendingCommission = Number(pendingPay._sum.commissionAmount ?? 0);
        const monthToPay =
          monthTotal?.status === 'PAGA'
            ? 0
            : fixedSalary + pendingCommission;

        return {
          ...emp,
          pendingCommission,
          osInProgress: osCount,
          monthToPay,
        };
      }),
    );
  }

  async findOne(organizationId: string, id: string) {
    const row = await this.prisma.employee.findFirst({
      where: { id, organizationId },
      include: {
        ...employeeInclude,
        commissionRules: {
          where: { isActive: true },
          include: { catalogItem: true, product: true },
        },
        generatedCommissions: {
          orderBy: { generatedAt: 'desc' },
          take: 50,
          include: { serviceOrder: { select: { number: true } } },
        },
        entries: { orderBy: { entryDate: 'desc' }, take: 50 },
        payrolls: { orderBy: { periodStart: 'desc' }, take: 12 },
        documents: true,
        actionLogs: { orderBy: { createdAt: 'desc' }, take: 30 },
      },
    });
    if (!row) throw new NotFoundException('Funcionário não encontrado');
    return row;
  }

  async create(
    organizationId: string,
    dto: CreateEmployeeDto,
    userId?: string,
  ) {
    await this.ensureDefaultJobTitles(organizationId);

    const row = await this.prisma.employee.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        cpf: dto.cpf?.replace(/\D/g, '') || null,
        rg: dto.rg ?? null,
        phone: dto.phone ?? null,
        whatsapp: dto.whatsapp ?? null,
        email: dto.email ?? null,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        address: dto.address ?? null,
        jobTitleId: dto.jobTitleId ?? null,
        employmentType: dto.employmentType ?? 'CLT',
        hireDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
        terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : null,
        status: dto.status ?? 'ACTIVE',
        photoUrl: dto.photoUrl ?? null,
        accessProfile: dto.accessProfile ?? null,
        isTechnical: dto.isTechnical ?? false,
        notes: dto.notes ?? null,
        memberId: dto.memberId ?? null,
      },
      include: employeeInclude,
    });

    await this.actionLog.log(organizationId, {
      userId,
      employeeId: row.id,
      module: 'team',
      action: 'employee.create',
      entity: 'employee',
      entityId: row.id,
      description: `Funcionário ${row.name} cadastrado`,
    });

    if (
      dto.createAccess &&
      dto.loginUsername &&
      dto.password &&
      dto.accessProfile
    ) {
      return this.access.provisionAccess(
        organizationId,
        row.id,
        {
          loginUsername: dto.loginUsername,
          password: dto.password,
          accessProfile: dto.accessProfile,
          accessActive: dto.accessActive,
        },
        userId,
      );
    }

    return row;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateEmployeeDto,
    userId?: string,
  ) {
    await this.findOne(organizationId, id);

    const row = await this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.cpf !== undefined ? { cpf: dto.cpf.replace(/\D/g, '') || null } : {}),
        ...(dto.rg !== undefined ? { rg: dto.rg || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
        ...(dto.whatsapp !== undefined ? { whatsapp: dto.whatsapp || null } : {}),
        ...(dto.email !== undefined ? { email: dto.email || null } : {}),
        ...(dto.birthDate !== undefined
          ? { birthDate: dto.birthDate ? new Date(dto.birthDate) : null }
          : {}),
        ...(dto.address !== undefined ? { address: dto.address || null } : {}),
        ...(dto.jobTitleId !== undefined ? { jobTitleId: dto.jobTitleId || null } : {}),
        ...(dto.employmentType !== undefined ? { employmentType: dto.employmentType } : {}),
        ...(dto.hireDate !== undefined
          ? { hireDate: dto.hireDate ? new Date(dto.hireDate) : null }
          : {}),
        ...(dto.terminationDate !== undefined
          ? { terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.photoUrl !== undefined ? { photoUrl: dto.photoUrl || null } : {}),
        ...(dto.accessProfile !== undefined ? { accessProfile: dto.accessProfile || null } : {}),
        ...(dto.isTechnical !== undefined ? { isTechnical: dto.isTechnical } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
        ...(dto.memberId !== undefined ? { memberId: dto.memberId || null } : {}),
      },
      include: employeeInclude,
    });

    await this.actionLog.log(organizationId, {
      userId,
      employeeId: id,
      module: 'team',
      action: 'employee.update',
      entity: 'employee',
      entityId: id,
      description: `Funcionário ${row.name} atualizado`,
    });

    return row;
  }

  async upsertPaymentConfig(
    organizationId: string,
    employeeId: string,
    dto: EmployeePaymentConfigDto,
    userId?: string,
  ) {
    await this.findOne(organizationId, employeeId);

    const row = await this.prisma.employeePaymentConfig.upsert({
      where: { employeeId },
      create: {
        organizationId,
        employeeId,
        paymentType: dto.paymentType,
        fixedSalary: dto.fixedSalary ?? null,
        paymentDay: dto.paymentDay ?? null,
        periodicity: dto.periodicity ?? 'MENSAL',
        paymentMethod: dto.paymentMethod ?? null,
        bankName: dto.bankName ?? null,
        pixKey: dto.pixKey ?? null,
        allowBonus: dto.allowBonus ?? true,
        allowDiscount: dto.allowDiscount ?? true,
        allowAdvance: dto.allowAdvance ?? true,
        notes: dto.notes ?? null,
        isActive: dto.isActive ?? true,
      },
      update: {
        paymentType: dto.paymentType,
        fixedSalary: dto.fixedSalary ?? null,
        paymentDay: dto.paymentDay ?? null,
        periodicity: dto.periodicity ?? 'MENSAL',
        paymentMethod: dto.paymentMethod ?? null,
        bankName: dto.bankName ?? null,
        pixKey: dto.pixKey ?? null,
        allowBonus: dto.allowBonus ?? true,
        allowDiscount: dto.allowDiscount ?? true,
        allowAdvance: dto.allowAdvance ?? true,
        notes: dto.notes ?? null,
        isActive: dto.isActive ?? true,
      },
    });

    await this.actionLog.log(organizationId, {
      userId,
      employeeId,
      module: 'team',
      action: 'payment_config.update',
      entity: 'employee_payment_config',
      entityId: row.id,
      description: 'Configuração de pagamento atualizada',
    });

    return row;
  }

  async listTechnicians(organizationId: string) {
    return this.prisma.employee.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        OR: [{ isTechnical: true }, { jobTitle: { isTechnical: true } }],
      },
      select: { id: true, name: true, jobTitle: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async productivity(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    employeeId?: string,
  ) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    const employees = await this.prisma.employee.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        ...(employeeId ? { id: employeeId } : {}),
      },
      include: { jobTitle: true },
    });

    return Promise.all(
      employees.map(async (emp) => {
        const [osFinished, servicesExecuted, laborValue, commissions] =
          await Promise.all([
            this.prisma.serviceOrder.count({
              where: {
                organizationId,
                deletedAt: null,
                status: { in: ['FINISHED', 'DELIVERED'] },
                finalizedById: emp.id,
                updatedAt: { gte: start, lte: end },
              },
            }),
            this.prisma.serviceOrderItem.count({
              where: {
                organizationId,
                executorId: emp.id,
                itemType: 'SERVICE',
                createdAt: { gte: start, lte: end },
              },
            }),
            this.prisma.serviceOrderItem.aggregate({
              where: {
                organizationId,
                executorId: emp.id,
                itemType: 'SERVICE',
                createdAt: { gte: start, lte: end },
              },
              _sum: { unitPrice: true },
            }),
            this.prisma.generatedCommission.aggregate({
              where: {
                organizationId,
                employeeId: emp.id,
                generatedAt: { gte: start, lte: end },
              },
              _sum: { commissionAmount: true },
            }),
          ]);

        return {
          employee: emp,
          osFinished,
          servicesExecuted,
          laborValue: Number(laborValue._sum.unitPrice ?? 0),
          commissionsGenerated: Number(commissions._sum.commissionAmount ?? 0),
        };
      }),
    );
  }
}
