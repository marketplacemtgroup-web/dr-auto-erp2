import { Prisma, ServiceOrderStatus } from '@prisma/client';

type FreeTextQuote = {
  summaryMode?: boolean;
  summaryText?: string | null;
  summaryAmount?: Prisma.Decimal | number | null;
  amount?: Prisma.Decimal | number;
};

export function freeTextQuoteAmount(quote: FreeTextQuote): number {
  if (!quote.summaryMode) return 0;
  if (quote.summaryAmount != null) return Number(quote.summaryAmount);
  return Number(quote.amount ?? 0);
}

export function isFreeTextOnlyQuote(quote: FreeTextQuote): boolean {
  return Boolean(quote.summaryMode) && freeTextQuoteAmount(quote) > 0;
}

export function freeTextAliases(quote: FreeTextQuote) {
  const enabled = quote.summaryMode ?? false;
  const content = quote.summaryText ?? null;
  const amount =
    quote.summaryAmount != null ? Number(quote.summaryAmount) : null;
  return {
    summaryMode: enabled,
    summaryText: content,
    summaryAmount: amount,
    freeTextEnabled: enabled,
    freeTextContent: content,
    freeTextAmount: amount,
  };
}

/** Após aprovação free-text: garante item na OS e status APPROVED. */
export async function applyFreeTextApprovalToServiceOrder(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string;
    serviceOrderId: string;
    fromStatus: ServiceOrderStatus;
    summaryText: string;
    amount: number;
  },
) {
  const { organizationId, serviceOrderId, fromStatus, summaryText, amount } =
    params;
  const description = summaryText.trim().slice(0, 500) || 'Orçamento aprovado';

  const itemCount = await tx.serviceOrderItem.count({
    where: { serviceOrderId, organizationId },
  });

  if (itemCount === 0) {
    await tx.serviceOrderItem.create({
      data: {
        organizationId,
        serviceOrderId,
        description,
        itemType: 'SERVICE',
        quantity: 1,
        unitPrice: new Prisma.Decimal(amount),
      },
    });
  }

  const osNextStatus: ServiceOrderStatus = 'APPROVED';

  await tx.serviceOrder.update({
    where: { id: serviceOrderId },
    data: {
      status: osNextStatus,
      totalAmount: new Prisma.Decimal(amount),
    },
  });

  await tx.serviceOrderStatusHistory.create({
    data: {
      organizationId,
      serviceOrderId,
      fromStatus,
      toStatus: osNextStatus,
      notes: 'Orçamento em texto livre aprovado pelo cliente (portal)',
    },
  });

  return osNextStatus;
}

/** Normaliza DTO com aliases freeText* → summary*. */
export function normalizeFreeTextDto<T extends {
  summaryMode?: boolean;
  summaryText?: string | null;
  summaryAmount?: number | null;
  freeTextEnabled?: boolean;
  freeTextContent?: string | null;
  freeTextAmount?: number | null;
}>(dto: T): T {
  if (dto.freeTextEnabled !== undefined && dto.summaryMode === undefined) {
    dto.summaryMode = dto.freeTextEnabled;
  }
  if (dto.freeTextContent !== undefined && dto.summaryText === undefined) {
    dto.summaryText = dto.freeTextContent;
  }
  if (dto.freeTextAmount !== undefined && dto.summaryAmount === undefined) {
    dto.summaryAmount = dto.freeTextAmount;
  }
  return dto;
}
