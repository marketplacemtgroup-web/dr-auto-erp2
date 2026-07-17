import { Injectable } from '@nestjs/common';
import {
  CommissionBase,
  CommissionItemType,
  CommissionRuleType,
  CommissionTrigger,
  GeneratedCommissionStatus,
  Prisma,
  ServiceOrderItemType,
  ServiceOrderStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isCommissionEligibleItemType } from '../common/item-type.util';

type RuleRow = {
  id: string;
  ruleType: CommissionRuleType;
  baseCalculation: CommissionBase;
  percentage: Prisma.Decimal | null;
  fixedAmount: Prisma.Decimal | null;
  catalogItemId: string | null;
  productId: string | null;
  considerDiscount: boolean;
};

type ServiceExecutorShare = {
  employeeId: string;
  sharePct: number;
};

@Injectable()
export class CommissionEngineService {
  constructor(private readonly prisma: PrismaService) {}

  itemLineTotal(qty: number, unitPrice: number, discount: number) {
    return Math.max(0, qty * unitPrice - discount);
  }

  calculateAmount(rule: RuleRow, baseAmount: number): number {
    if (rule.ruleType === 'VALOR_FIXO' && rule.fixedAmount != null) {
      return Number(rule.fixedAmount);
    }
    if (rule.ruleType === 'PERCENTUAL' && rule.percentage != null) {
      return Math.round(baseAmount * (Number(rule.percentage) / 100) * 100) / 100;
    }
    return 0;
  }

  resolveServiceExecutors(
    item: {
      executorId: string | null;
      coExecutorId: string | null;
      coExecutorSplitPct: number | null;
    },
    so: { executionById: string | null },
  ): ServiceExecutorShare[] {
    const primaryId = item.executorId ?? so.executionById;
    if (!primaryId) return [];

    const coId = item.coExecutorId;
    if (!coId || coId === primaryId) {
      return [{ employeeId: primaryId, sharePct: 100 }];
    }

    const splitPct = Math.min(100, Math.max(0, item.coExecutorSplitPct ?? 50));
    const primaryShare = 100 - splitPct;
    const shares: ServiceExecutorShare[] = [];
    if (primaryShare > 0) shares.push({ employeeId: primaryId, sharePct: primaryShare });
    if (splitPct > 0) shares.push({ employeeId: coId, sharePct: splitPct });
    return shares;
  }

  pickBestServiceRule(
    rules: RuleRow[],
    catalogItemId: string | null,
  ): RuleRow | null {
    let best: RuleRow | null = null;
    let bestAmount = 0;

    for (const rule of rules) {
      if (
        rule.baseCalculation !== 'MAO_DE_OBRA' &&
        rule.baseCalculation !== 'SERVICO_ESPECIFICO'
      ) {
        continue;
      }
      if (
        rule.baseCalculation === 'SERVICO_ESPECIFICO' &&
        rule.catalogItemId &&
        rule.catalogItemId !== catalogItemId
      ) {
        continue;
      }
      const amount = this.calculateAmount(rule, 1);
      const score =
        rule.ruleType === 'PERCENTUAL'
          ? Number(rule.percentage ?? 0)
          : amount;
      if (score > bestAmount) {
        bestAmount = score;
        best = rule;
      }
    }

    return best;
  }

  pickBestPartRule(rules: RuleRow[], productId: string | null): RuleRow | null {
    let best: RuleRow | null = null;
    let bestAmount = 0;

    for (const rule of rules) {
      if (
        rule.baseCalculation !== 'PECAS' &&
        rule.baseCalculation !== 'PRODUTO_ESPECIFICO'
      ) {
        continue;
      }
      if (
        rule.baseCalculation === 'PRODUTO_ESPECIFICO' &&
        rule.productId &&
        rule.productId !== productId
      ) {
        continue;
      }
      const score =
        rule.ruleType === 'PERCENTUAL'
          ? Number(rule.percentage ?? 0)
          : Number(rule.fixedAmount ?? 0);
      if (score > bestAmount) {
        bestAmount = score;
        best = rule;
      }
    }

    return best;
  }

  commissionForShare(
    rule: RuleRow,
    lineTotal: number,
    qty: number,
    unitPrice: number,
    sharePct: number,
  ): number {
    const base = rule.considerDiscount ? lineTotal : qty * unitPrice;
    const shareBase = Math.round(base * (sharePct / 100) * 100) / 100;
    return this.calculateAmount(rule, shareBase);
  }

  async getActiveRules(employeeId: string, trigger?: CommissionTrigger) {
    return this.prisma.employeeCommissionRule.findMany({
      where: {
        employeeId,
        isActive: true,
        ...(trigger ? { trigger } : {}),
      },
    });
  }

  async previewForItem(
    organizationId: string,
    employeeId: string,
    params: {
      itemType: ServiceOrderItemType;
      quantity: number;
      unitPrice: number;
      discount?: number;
      catalogItemId?: string | null;
      productId?: string | null;
      sharePct?: number;
    },
  ): Promise<number> {
    const rules = await this.getActiveRules(employeeId);
    if (!rules.length) return 0;

    const lineTotal = this.itemLineTotal(
      params.quantity,
      params.unitPrice,
      params.discount ?? 0,
    );
    const sharePct = params.sharePct ?? 100;

    if (params.itemType === 'SERVICE') {
      const rule = this.pickBestServiceRule(rules, params.catalogItemId ?? null);
      if (!rule) return 0;
      return this.commissionForShare(
        rule,
        lineTotal,
        params.quantity,
        params.unitPrice,
        sharePct,
      );
    }

    if (params.itemType === 'PART') {
      const rule = this.pickBestPartRule(rules, params.productId ?? null);
      if (!rule) return 0;
      return this.commissionForShare(
        rule,
        lineTotal,
        params.quantity,
        params.unitPrice,
        sharePct,
      );
    }

    return 0;
  }

  async previewForServiceItem(params: {
    organizationId: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    catalogItemId?: string | null;
    executorId?: string | null;
    coExecutorId?: string | null;
    coExecutorSplitPct?: number | null;
    executionById?: string | null;
  }): Promise<number> {
    const shares = this.resolveServiceExecutors(
      {
        executorId: params.executorId ?? null,
        coExecutorId: params.coExecutorId ?? null,
        coExecutorSplitPct: params.coExecutorSplitPct ?? null,
      },
      { executionById: params.executionById ?? null },
    );
    if (!shares.length) return 0;

    let total = 0;
    for (const share of shares) {
      total += await this.previewForItem(params.organizationId, share.employeeId, {
        itemType: 'SERVICE',
        quantity: params.quantity,
        unitPrice: params.unitPrice,
        discount: params.discount ?? 0,
        catalogItemId: params.catalogItemId ?? null,
        sharePct: share.sharePct,
      });
    }
    return Math.round(total * 100) / 100;
  }

  async generateForServiceOrder(
    organizationId: string,
    serviceOrderId: string,
    trigger: CommissionTrigger,
  ) {
    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, organizationId },
      include: {
        items: { include: { catalogItem: true, product: true } },
      },
    });
    if (!so) return [];

    const employeeIds = new Set<string>();
    for (const item of so.items) {
      if (item.itemType === 'SERVICE') {
        for (const share of this.resolveServiceExecutors(item, so)) {
          employeeIds.add(share.employeeId);
        }
      }
      if (item.itemType === 'PART' && item.soldById) {
        employeeIds.add(item.soldById);
      }
    }
    for (const employeeId of [
      so.finalizedById,
      so.executionById,
      so.coExecutionById,
      so.generalResponsibleId,
    ]) {
      if (employeeId) employeeIds.add(employeeId);
    }

    const employeeIdList = [...employeeIds];
    const [allRules, existingCommissions, employeesMeta] = await Promise.all([
      employeeIdList.length
        ? this.prisma.employeeCommissionRule.findMany({
            where: {
              employeeId: { in: employeeIdList },
              isActive: true,
              trigger,
            },
          })
        : Promise.resolve([]),
      this.prisma.generatedCommission.findMany({
        where: {
          organizationId,
          serviceOrderId,
          status: { not: 'CANCELADA' },
        },
        select: { employeeId: true, itemId: true, itemType: true },
      }),
      employeeIdList.length
        ? this.prisma.employee.findMany({
            where: { id: { in: employeeIdList }, organizationId },
            select: {
              id: true,
              isTechnical: true,
              jobTitle: { select: { isTechnical: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const rulesByEmployee = new Map<string, RuleRow[]>();
    for (const rule of allRules) {
      const list = rulesByEmployee.get(rule.employeeId) ?? [];
      list.push(rule);
      rulesByEmployee.set(rule.employeeId, list);
    }

    const technicalEmployeeIds = new Set(
      employeesMeta
        .filter((e) => e.isTechnical || e.jobTitle?.isTechnical)
        .map((e) => e.id),
    );
    for (const employeeId of employeeIdList) {
      const rules = rulesByEmployee.get(employeeId) ?? [];
      if (rules.some((r) => r.baseCalculation === 'MAO_DE_OBRA' || r.baseCalculation === 'SERVICO_ESPECIFICO')) {
        technicalEmployeeIds.add(employeeId);
      }
    }

    const existingKeys = new Set(
      existingCommissions.map((row) =>
        row.itemType === 'OS'
          ? `${row.employeeId}:OS`
          : `${row.employeeId}:${row.itemId ?? ''}`,
      ),
    );

    const toCreate: Prisma.GeneratedCommissionCreateManyInput[] = [];
    const itemCommissionUpdates: Array<{ id: string; amount: number }> = [];

    for (const item of so.items) {
      const discount = Number(item.discount ?? 0);
      const lineTotal = this.itemLineTotal(
        item.quantity,
        Number(item.unitPrice),
        discount,
      );

      if (!isCommissionEligibleItemType(item.itemType)) {
        continue;
      }

      if (item.itemType === 'SERVICE') {
        const shares = this.resolveServiceExecutors(item, so);
        let itemExpectedTotal = 0;

        for (const share of shares) {
          const rules = rulesByEmployee.get(share.employeeId) ?? [];
          const rule = this.pickBestServiceRule(rules, item.catalogItemId);
          if (!rule) continue;

          const base = rule.considerDiscount
            ? lineTotal
            : item.quantity * Number(item.unitPrice);
          const shareBase = Math.round(base * (share.sharePct / 100) * 100) / 100;
          const commissionAmount = this.calculateAmount(rule, shareBase);
          if (commissionAmount <= 0) continue;

          itemExpectedTotal += commissionAmount;

          const key = `${share.employeeId}:${item.id}`;
          if (existingKeys.has(key)) continue;
          existingKeys.add(key);

          toCreate.push({
            organizationId,
            employeeId: share.employeeId,
            serviceOrderId,
            itemId: item.id,
            itemType: 'SERVICO' as CommissionItemType,
            ruleType: rule.ruleType,
            description: `Comissão — ${item.description}`,
            baseAmount: shareBase,
            percentage: rule.percentage,
            fixedAmount: rule.fixedAmount,
            commissionAmount,
            status: 'PENDENTE' as GeneratedCommissionStatus,
          });
        }

        if (itemExpectedTotal > 0) {
          itemCommissionUpdates.push({
            id: item.id,
            amount: Math.round(itemExpectedTotal * 100) / 100,
          });
        }
      }

      if (item.itemType === 'PART' && item.soldById) {
        const rules = rulesByEmployee.get(item.soldById) ?? [];
        const rule = this.pickBestPartRule(rules, item.productId);
        if (!rule) continue;

        const base = rule.considerDiscount
          ? lineTotal
          : item.quantity * Number(item.unitPrice);
        const commissionAmount = this.calculateAmount(rule, base);
        if (commissionAmount <= 0) continue;

        const key = `${item.soldById}:${item.id}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);

        toCreate.push({
          organizationId,
          employeeId: item.soldById,
          serviceOrderId,
          itemId: item.id,
          itemType: 'PECA' as CommissionItemType,
          ruleType: rule.ruleType,
          description: `Comissão peça — ${item.description}`,
          baseAmount: base,
          percentage: rule.percentage,
          fixedAmount: rule.fixedAmount,
          commissionAmount,
          status: 'PENDENTE',
        });
      }
    }

    const osTotal = Number(so.totalAmount);
    for (const employeeId of employeeIdList) {
      if (technicalEmployeeIds.has(employeeId)) continue;

      const rules = rulesByEmployee.get(employeeId) ?? [];
      const rule = rules.find(
        (r) =>
          r.baseCalculation === 'TOTAL_OS' ||
          r.baseCalculation === 'OS_FINALIZADA',
      );
      if (!rule) continue;

      const commissionAmount = this.calculateAmount(rule, osTotal);
      if (commissionAmount <= 0) continue;

      const key = `${employeeId}:OS`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);

      toCreate.push({
        organizationId,
        employeeId,
        serviceOrderId,
        itemType: 'OS',
        ruleType: rule.ruleType,
        description: `Comissão OS #${so.number}`,
        baseAmount: osTotal,
        percentage: rule.percentage,
        fixedAmount: rule.fixedAmount,
        commissionAmount,
        status: 'PENDENTE',
      });
    }

    if (toCreate.length) {
      await this.prisma.generatedCommission.createMany({ data: toCreate });
    }

    if (itemCommissionUpdates.length) {
      await this.prisma.$transaction(
        itemCommissionUpdates.map((row) =>
          this.prisma.serviceOrderItem.update({
            where: { id: row.id },
            data: { expectedCommission: row.amount },
          }),
        ),
      );
    }

    return toCreate.map((_, index) => `batch-${index}`);
  }

  async cancelForServiceOrder(organizationId: string, serviceOrderId: string) {
    await this.prisma.generatedCommission.updateMany({
      where: {
        organizationId,
        serviceOrderId,
        status: { in: ['PENDENTE', 'APROVADA'] },
      },
      data: { status: 'CANCELADA' },
    });
  }

  /** Recalcula comissões pendentes após alteração de equipe em OS fechada. */
  async regenerateForServiceOrder(organizationId: string, serviceOrderId: string) {
    await this.prisma.generatedCommission.updateMany({
      where: {
        organizationId,
        serviceOrderId,
        payrollId: null,
        status: { in: ['PENDENTE', 'APROVADA'] },
      },
      data: { status: 'CANCELADA' },
    });

    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, organizationId },
      select: { status: true },
    });
    if (!so) return [];

    const closed: ServiceOrderStatus[] = ['FINISHED', 'DELIVERED', 'AWAITING_PAYMENT'];
    if (!closed.includes(so.status)) return [];

    const trigger = so.status === 'DELIVERED' ? 'OS_ENTREGUE' : 'OS_FINALIZADA';
    return this.generateForServiceOrder(organizationId, serviceOrderId, trigger);
  }
}
