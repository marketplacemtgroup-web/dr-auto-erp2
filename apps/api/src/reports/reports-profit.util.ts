import { Prisma, ServiceOrderStatus } from '@prisma/client';
import type { ServiceOrderItemTypeValue } from '../common/item-type.util';

/** OS com serviço concluído — lucro reconhecido (mesma base do financeiro). */
export const PROFIT_RECOGNIZED_STATUSES: ServiceOrderStatus[] = [
  'FINISHED',
  'DELIVERED',
  'AWAITING_PAYMENT',
];

type ItemLike = {
  itemType: ServiceOrderItemTypeValue | string;
  unitPrice: Prisma.Decimal | number;
  quantity: number;
  discount: Prisma.Decimal | number;
  unitCost?: Prisma.Decimal | number | null;
  actualUnitCost?: Prisma.Decimal | number | null;
};

type ProductCostLike = {
  averageCost?: Prisma.Decimal | number | null;
  costPrice?: Prisma.Decimal | number | null;
} | null;

export function itemRevenue(item: ItemLike) {
  return Number(item.unitPrice) * item.quantity - Number(item.discount);
}

export function itemPartUnitCost(item: ItemLike, product?: ProductCostLike) {
  if (item.unitCost != null) return Number(item.unitCost);
  return Number(product?.averageCost) || Number(product?.costPrice ?? 0);
}

export function itemActualUnitCost(item: ItemLike, product?: ProductCostLike) {
  if (item.actualUnitCost != null) return Number(item.actualUnitCost);
  return itemPartUnitCost(item, product);
}

export function calcItemProfit(item: ItemLike, product?: ProductCostLike) {
  return calcItemPlannedProfit(item, product);
}

export function calcItemPlannedProfit(item: ItemLike, product?: ProductCostLike) {
  const revenue = itemRevenue(item);
  if (item.itemType === 'PART') {
    return revenue - itemPartUnitCost(item, product) * item.quantity;
  }
  if (item.itemType === 'THIRD_PARTY' && item.unitCost != null) {
    return revenue - Number(item.unitCost) * item.quantity;
  }
  return revenue;
}

export function calcItemActualProfit(item: ItemLike, product?: ProductCostLike) {
  const revenue = itemRevenue(item);
  if (item.itemType === 'PART') {
    return revenue - itemActualUnitCost(item, product) * item.quantity;
  }
  if (item.itemType === 'THIRD_PARTY') {
    const cost = item.actualUnitCost ?? item.unitCost;
    if (cost != null) return revenue - Number(cost) * item.quantity;
  }
  return revenue;
}

export function profitRecognizedOrderWhere(
  organizationId: string,
  period: { from: Date; to: Date },
) {
  // Reconhecimento por closedAt (data de fechamento estável), não por updatedAt —
  // assim editar uma OS depois não move o lucro para outro mês.
  return {
    organizationId,
    status: { in: PROFIT_RECOGNIZED_STATUSES },
    closedAt: { gte: period.from, lte: period.to },
    deletedAt: null,
  };
}

/** Saídas que não são custo operacional (retiradas, empréstimos, aportes, transferências). */
export function isNonOperationalPayable(
  description: string,
  origin?: string | null,
) {
  if (
    origin === 'WITHDRAWAL' ||
    origin === 'LOAN' ||
    origin === 'CONTRIBUTION' ||
    origin === 'TRANSFER'
  ) {
    return true;
  }
  const d = description.toUpperCase();
  return (
    d.includes('RETIRADA') ||
    d.includes('DEVOLU') ||
    d.includes('EMPR') ||
    d.includes('APORTE') ||
    d.includes('TRANSFER') ||
    d.includes('CART')
  );
}
