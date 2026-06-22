import { Prisma, QuoteLineType } from '@prisma/client';

/** Rótulos e helpers para tipos de item de OS / linha de orçamento. */
export const SERVICE_ORDER_ITEM_TYPES = [
  'SERVICE',
  'PART',
  'SCANNER',
  'THIRD_PARTY',
] as const;

export type ServiceOrderItemTypeValue = (typeof SERVICE_ORDER_ITEM_TYPES)[number];

export function itemTypeLabel(itemType: string): string {
  switch (itemType) {
    case 'PART':
      return 'Peça';
    case 'SCANNER':
      return 'Scanner';
    case 'THIRD_PARTY':
      return 'Terceirizado';
    default:
      return 'Serviço';
  }
}

export function lineTypeLabel(lineType: string): string {
  return itemTypeLabel(lineType);
}

export function isCommissionEligibleItemType(itemType: string): boolean {
  return itemType === 'SERVICE' || itemType === 'PART';
}

export function mapServiceOrderItemToQuoteLineType(itemType: string): QuoteLineType {
  if (itemType === 'PART') return 'PART';
  if (itemType === 'SCANNER') return 'SCANNER';
  if (itemType === 'THIRD_PARTY') return 'THIRD_PARTY';
  return 'SERVICE';
}
