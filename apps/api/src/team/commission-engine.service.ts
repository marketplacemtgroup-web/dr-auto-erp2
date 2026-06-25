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
    },
  ): Promise<number> {
    const rules = await this.getActiveRules(employeeId);
    if (!rules.length) return 0;

    const base = this.itemLineTotal(
      params.quantity,
      params.unitPrice,
      params.discount ?? 0,
    );
    let best = 0;

    for (const rule of rules) {
      if (params.itemType === 'SERVICE') {
        if (
          rule.baseCalculation !== 'MAO_DE_OBRA' &&
          rule.baseCalculation !== 'SERVICO_ESPECIFICO'
        ) {
          continue;
        }
        if (
          rule.baseCalculation === 'SERVICO_ESPECIFICO' &&
          rule.catalogItemId &&
          rule.catalogItemId !== params.catalogItemId
        ) {
          continue;
        }
      } else if (params.itemType === 'PART') {
        if (
          rule.baseCalculation !== 'PECAS' &&
          rule.baseCalculation !== 'PRODUTO_ESPECIFICO'
        ) {
          continue;
        }
        if (
          rule.baseCalculation === 'PRODUTO_ESPECIFICO' &&
          rule.productId &&
          rule.productId !== params.productId
        ) {
          continue;
        }
      } else {
        continue;
      }

      const amount = this.calculateAmount(rule, base);
      if (amount > best) best = amount;
    }

    return best;
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
        const employeeId = item.executorId ?? so.executionById;
        if (employeeId) employeeIds.add(employeeId);
      }
      if (item.itemType === 'PART' && item.soldById) {
        employeeIds.add(item.soldById);
      }
    }
    for (const employeeId of [
      so.finalizedById,
      so.executionById,
      so.generalResponsibleId,
    ]) {
      if (employeeId) employeeIds.add(employeeId);
    }

    const employeeIdList = [...employeeIds];
    const [allRules, existingCommissions] = await Promise.all([
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
    ]);

    const rulesByEmployee = new Map<string, RuleRow[]>();
    for (const rule of allRules) {
      const list = rulesByEmployee.get(rule.employeeId) ?? [];
      list.push(rule);
      rulesByEmployee.set(rule.employeeId, list);
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
        const employeeId = item.executorId ?? so.executionById;
        if (!employeeId) continue;

        const rules = rulesByEmployee.get(employeeId) ?? [];
        const applicable = rules.filter(
          (r) =>
            r.baseCalculation === 'MAO_DE_OBRA' ||
            (r.baseCalculation === 'SERVICO_ESPECIFICO' &&
              (!r.catalogItemId || r.catalogItemId === item.catalogItemId)),
        );

        for (const rule of applicable) {
          const base = rule.considerDiscount
            ? lineTotal
            : item.quantity * Number(item.unitPrice);
          const commissionAmount = this.calculateAmount(rule, base);
          if (commissionAmount <= 0) continue;

          const key = `${employeeId}:${item.id}`;
          if (existingKeys.has(key)) continue;
          existingKeys.add(key);

          toCreate.push({
            organizationId,
            employeeId,
            serviceOrderId,
            itemId: item.id,
            itemType: 'SERVICO' as CommissionItemType,
            ruleType: rule.ruleType,
            description: `Comissão — ${item.description}`,
            baseAmount: base,
            percentage: rule.percentage,
            fixedAmount: rule.fixedAmount,
            commissionAmount,
            status: 'PENDENTE' as GeneratedCommissionStatus,
          });
          itemCommissionUpdates.push({ id: item.id, amount: commissionAmount });
        }
      }

      if (item.itemType === 'PART' && item.soldById) {
        const rules = rulesByEmployee.get(item.soldById) ?? [];
        const applicable = rules.filter(
          (r) =>
            r.baseCalculation === 'PECAS' ||
            (r.baseCalculation === 'PRODUTO_ESPECIFICO' &&
              (!r.productId || r.productId === item.productId)),
        );

        for (const rule of applicable) {
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
    }

    const osTotal = Number(so.totalAmount);
    for (const employeeId of employeeIdList) {
      const rules = rulesByEmployee.get(employeeId) ?? [];
      for (const rule of rules.filter(
        (r) =>
          r.baseCalculation === 'TOTAL_OS' ||
          r.baseCalculation === 'OS_FINALIZADA',
      )) {
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
