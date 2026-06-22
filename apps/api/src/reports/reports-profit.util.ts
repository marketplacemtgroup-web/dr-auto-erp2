import { Prisma, ServiceOrderItemType, ServiceOrderStatus } from '@prisma/client';

/** OS com serviço concluído — lucro reconhecido (mesma base do financeiro). */
export const PROFIT_RECOGNIZED_STATUSES: ServiceOrderStatus[] = [
  'FINISHED',
  'DELIVERED',
  'AWAITING_PAYMENT',
];

type ItemLike = {
  itemType: ServiceOrderItemType;
  unitPrice: Prisma.Decimal | number;
  quantity: number;
  discount: Prisma.Decimal | number;
  unitCost?: Prisma.Decimal | number | null;
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

export function calcItemProfit(item: ItemLike, product?: ProductCostLike) {
  const revenue = itemRevenue(item);
  if (item.itemType === 'PART') {
    return revenue - itemPartUnitCost(item, product) * item.quantity;
  }
  return revenue;
}

export function profitRecognizedOrderWhere(
  organizationId: string,
  period: { from: Date; to: Date },
) {
  return {
    organizationId,
    status: { in: PROFIT_RECOGNIZED_STATUSES },
    updatedAt: { gte: period.from, lte: period.to },
    deletedAt: null,
  };
}
