import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamActionLogService } from './team-action-log.service';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';

@Injectable()
export class CommissionRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionLog: TeamActionLogService,
  ) {}

  list(organizationId: string, employeeId?: string) {
    return this.prisma.employeeCommissionRule.findMany({
      where: {
        organizationId,
        ...(employeeId ? { employeeId } : {}),
      },
      include: {
        employee: { select: { id: true, name: true, paymentConfig: true } },
        catalogItem: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
      orderBy: [{ employee: { name: 'asc' } }, { createdAt: 'desc' }],
    });
  }

  async create(
    organizationId: string,
    dto: CreateCommissionRuleDto,
    userId?: string,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, organizationId },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');

    const row = await this.prisma.employeeCommissionRule.create({
      data: {
        organizationId,
        employeeId: dto.employeeId,
        ruleType: dto.ruleType,
        baseCalculation: dto.baseCalculation,
        percentage: dto.percentage ?? null,
        fixedAmount: dto.fixedAmount ?? null,
        catalogItemId: dto.catalogItemId ?? null,
        productId: dto.productId ?? null,
        trigger: dto.trigger ?? 'OS_FINALIZADA',
        considerDiscount: dto.considerDiscount ?? true,
        considerOnlyReceived: dto.considerOnlyReceived ?? false,
        isActive: dto.isActive ?? true,
      },
      include: {
        employee: { select: { id: true, name: true } },
        catalogItem: true,
        product: true,
      },
    });

    await this.actionLog.log(organizationId, {
      userId,
      employeeId: dto.employeeId,
      module: 'commissions',
      action: 'rule.create',
      entity: 'commission_rule',
      entityId: row.id,
      description: `Regra de comissão criada para ${employee.name}`,
    });

    return row;
  }

  async update(
    organizationId: string,
    id: string,
    dto: Partial<CreateCommissionRuleDto>,
    userId?: string,
  ) {
    const current = await this.prisma.employeeCommissionRule.findFirst({
      where: { id, organizationId },
    });
    if (!current) throw new NotFoundException('Regra não encontrada');

    const row = await this.prisma.employeeCommissionRule.update({
      where: { id },
      data: {
        ...(dto.ruleType !== undefined ? { ruleType: dto.ruleType } : {}),
        ...(dto.baseCalculation !== undefined ? { baseCalculation: dto.baseCalculation } : {}),
        ...(dto.percentage !== undefined ? { percentage: dto.percentage } : {}),
        ...(dto.fixedAmount !== undefined ? { fixedAmount: dto.fixedAmount } : {}),
        ...(dto.catalogItemId !== undefined ? { catalogItemId: dto.catalogItemId || null } : {}),
        ...(dto.productId !== undefined ? { productId: dto.productId || null } : {}),
        ...(dto.trigger !== undefined ? { trigger: dto.trigger } : {}),
        ...(dto.considerDiscount !== undefined ? { considerDiscount: dto.considerDiscount } : {}),
        ...(dto.considerOnlyReceived !== undefined
          ? { considerOnlyReceived: dto.considerOnlyReceived }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        employee: { select: { id: true, name: true } },
        catalogItem: true,
        product: true,
      },
    });

    await this.actionLog.log(organizationId, {
      userId,
      employeeId: row.employeeId,
      module: 'commissions',
      action: 'rule.update',
      entity: 'commission_rule',
      entityId: id,
      description: 'Regra de comissão atualizada',
    });

    return row;
  }

  listGenerated(
    organizationId: string,
    filters?: { employeeId?: string; status?: string },
  ) {
    return this.prisma.generatedCommission.findMany({
      where: {
        organizationId,
        ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      include: {
        employee: { select: { id: true, name: true } },
        serviceOrder: { select: { id: true, number: true } },
      },
      orderBy: { generatedAt: 'desc' },
      take: 200,
    });
  }

  async duplicate(organizationId: string, id: string, userId?: string) {
    const source = await this.prisma.employeeCommissionRule.findFirst({
      where: { id, organizationId },
    });
    if (!source) throw new NotFoundException('Regra não encontrada');

    return this.create(
      organizationId,
      {
        employeeId: source.employeeId,
        ruleType: source.ruleType,
        baseCalculation: source.baseCalculation,
        percentage: source.percentage ? Number(source.percentage) : undefined,
        fixedAmount: source.fixedAmount ? Number(source.fixedAmount) : undefined,
        catalogItemId: source.catalogItemId ?? undefined,
        productId: source.productId ?? undefined,
        trigger: source.trigger,
        considerDiscount: source.considerDiscount,
        considerOnlyReceived: source.considerOnlyReceived,
        isActive: source.isActive,
      },
      userId,
    );
  }

  /** Lista técnicos sem regra MAO_DE_OBRA e regras TOTAL_OS/OS_FINALIZADA em técnicos. */
  async audit(organizationId: string) {
    const technicians = await this.prisma.employee.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        OR: [{ isTechnical: true }, { jobTitle: { isTechnical: true } }],
      },
      include: {
        commissionRules: { where: { isActive: true } },
        jobTitle: { select: { name: true, isTechnical: true } },
      },
      orderBy: { name: 'asc' },
    });

    const missingLaborRule = technicians
      .filter(
        (e) =>
          !e.commissionRules.some(
            (r) =>
              r.baseCalculation === 'MAO_DE_OBRA' ||
              r.baseCalculation === 'SERVICO_ESPECIFICO',
          ),
      )
      .map((e) => ({
        employeeId: e.id,
        name: e.name,
        issue: 'missing_mao_de_obra' as const,
        message: 'Sem regra ativa sobre mão de obra (recomendado: 30% em MAO_DE_OBRA)',
      }));

    const riskyTotalOsRules = technicians.flatMap((e) =>
      e.commissionRules
        .filter(
          (r) =>
            r.baseCalculation === 'TOTAL_OS' || r.baseCalculation === 'OS_FINALIZADA',
        )
        .map((r) => ({
          employeeId: e.id,
          name: e.name,
          ruleId: r.id,
          issue: 'total_os_on_technician' as const,
          message: `Regra "${r.baseCalculation}" calcula sobre valor total da OS — inadequado para mecânico`,
          percentage: r.percentage != null ? Number(r.percentage) : null,
        })),
    );

    const wrongPercentage = technicians.flatMap((e) =>
      e.commissionRules
        .filter(
          (r) =>
            r.baseCalculation === 'MAO_DE_OBRA' &&
            r.ruleType === 'PERCENTUAL' &&
            r.percentage != null &&
            Number(r.percentage) !== 30,
        )
        .map((r) => ({
          employeeId: e.id,
          name: e.name,
          ruleId: r.id,
          issue: 'non_standard_percentage' as const,
          message: `Regra MAO_DE_OBRA com ${Number(r.percentage)}% (padrão da oficina: 30%)`,
          percentage: Number(r.percentage),
        })),
    );

    return {
      ok: missingLaborRule.length === 0 && riskyTotalOsRules.length === 0,
      missingLaborRule,
      riskyTotalOsRules,
      wrongPercentage,
    };
  }
}
