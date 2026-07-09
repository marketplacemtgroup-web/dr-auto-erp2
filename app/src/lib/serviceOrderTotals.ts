export function serviceOrderItemLineTotal(item: {
  unitPrice: string | number;
  quantity: number;
  discount?: string | number | null;
}) {
  return Math.max(
    0,
    Number(item.unitPrice) * item.quantity - Number(item.discount ?? 0),
  );
}

export function sumServiceOrderItems(
  items: Array<{
    unitPrice: string | number;
    quantity: number;
    discount?: string | number | null;
  }>,
) {
  return items.reduce((sum, item) => sum + serviceOrderItemLineTotal(item), 0);
}

export function resolveServiceOrderTotal(
  items: Array<{
    unitPrice: string | number;
    quantity: number;
    discount?: string | number | null;
  }>,
  totalAmount: string | number,
  freeTextAmount?: string | number | null,
  freeTextEnabled?: boolean,
) {
  const itemsSum = sumServiceOrderItems(items);
  if (itemsSum > 0) return itemsSum;
  if (freeTextEnabled && Number(freeTextAmount ?? 0) > 0) {
    return Number(freeTextAmount);
  }
  return Number(totalAmount ?? 0);
}
