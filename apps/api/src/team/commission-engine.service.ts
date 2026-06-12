import { Injectable } from '@nestjs/common';
import {
  CommissionBase,
  CommissionItemType,
  CommissionRuleType,
  CommissionTrigger,
  GeneratedCommissionStatus,
  Prisma,
  ServiceOrderItemType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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

    const created: string[] = [];

    for (const item of so.items) {
      const discount = Number(item.discount ?? 0);
      const lineTotal = this.itemLineTotal(
        item.quantity,
        Number(item.unitPrice),
        discount,
      );

      if (item.itemType === 'SERVICE') {
        const employeeId = item.executorId ?? so.executionById;
        if (!employeeId) continue;

        const rules = await this.getActiveRules(employeeId, trigger);
        const applicable = rules.filter(
          (r) =>
            r.baseCalculation === 'MAO_DE_OBRA' ||
            (r.baseCalculation === 'SERVICO_ESPECIFICO' &&
              (!r.catalogItemId || r.catalogItemId === item.catalogItemId)),
        );

        for (const rule of applicable) {
          const base = rule.considerDiscount ? lineTotal : item.quantity * Number(item.unitPrice);
          const commissionAmount = this.calculateAmount(rule, base);
          if (commissionAmount <= 0) continue;

          const existing = await this.prisma.generatedCommission.findFirst({
            where: {
              organizationId,
              employeeId,
              itemId: item.id,
              status: { not: 'CANCELADA' },
            },
          });
          if (existing) continue;

          const row = await this.prisma.generatedCommission.create({
            data: {
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
            },
          });
          created.push(row.id);

          await this.prisma.serviceOrderItem.update({
            where: { id: item.id },
            data: { expectedCommission: commissionAmount },
          });
        }
      }

      if (item.itemType === 'PART' && item.soldById) {
        const rules = await this.getActiveRules(item.soldById, trigger);
        const applicable = rules.filter(
          (r) =>
            r.baseCalculation === 'PECAS' ||
            (r.baseCalculation === 'PRODUTO_ESPECIFICO' &&
              (!r.productId || r.productId === item.productId)),
        );

        for (const rule of applicable) {
          const base = rule.considerDiscount ? lineTotal : item.quantity * Number(item.unitPrice);
          const commissionAmount = this.calculateAmount(rule, base);
          if (commissionAmount <= 0) continue;

          const existing = await this.prisma.generatedCommission.findFirst({
            where: {
              organizationId,
              employeeId: item.soldById,
              itemId: item.id,
              status: { not: 'CANCELADA' },
            },
          });
          if (existing) continue;

          await this.prisma.generatedCommission.create({
            data: {
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
            },
          });
        }
      }
    }

    // OS-level fixed commission rules
    const osTotal = Number(so.totalAmount);
    const osEmployees = [
      so.finalizedById,
      so.executionById,
      so.generalResponsibleId,
    ].filter(Boolean) as string[];

    for (const employeeId of [...new Set(osEmployees)]) {
      const rules = await this.getActiveRules(employeeId, trigger);
      for (const rule of rules.filter(
        (r) => r.baseCalculation === 'TOTAL_OS' || r.baseCalculation === 'OS_FINALIZADA',
      )) {
        const commissionAmount = this.calculateAmount(rule, osTotal);
        if (commissionAmount <= 0) continue;

        const existing = await this.prisma.generatedCommission.findFirst({
          where: {
            organizationId,
            employeeId,
            serviceOrderId,
            itemType: 'OS',
            status: { not: 'CANCELADA' },
          },
        });
        if (existing) continue;

        await this.prisma.generatedCommission.create({
          data: {
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
          },
        });
      }
    }

    return created;
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
}
