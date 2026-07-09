export type ServiceOrderItemType = "SERVICE" | "PART" | "SCANNER" | "THIRD_PARTY";

export const SERVICE_ORDER_ITEM_TYPE_OPTIONS: Array<{
  value: ServiceOrderItemType;
  label: string;
}> = [
  { value: "SERVICE", label: "Serviço" },
  { value: "PART", label: "Peça" },
  { value: "SCANNER", label: "Scanner" },
  { value: "THIRD_PARTY", label: "Terceirizado" },
];

export function itemTypeLabel(itemType: string): string {
  return (
    SERVICE_ORDER_ITEM_TYPE_OPTIONS.find((option) => option.value === itemType)?.label ??
    "Serviço"
  );
}

export function isCommissionEligibleItemType(itemType: string): boolean {
  return itemType === "SERVICE" || itemType === "PART";
}

export function itemCatalogLabel(item: {
  itemType: string;
  product?: { name: string } | null;
  catalogItem?: { name: string } | null;
  outsourcedService?: { name: string; provider?: string | null } | null;
}): string | null {
  if (item.itemType === "THIRD_PARTY" && item.outsourcedService) {
    return item.outsourcedService.provider
      ? `${item.outsourcedService.name} · ${item.outsourcedService.provider}`
      : item.outsourcedService.name;
  }
  if (item.itemType === "PART" && item.product) return item.product.name;
  if (item.itemType === "SERVICE" && item.catalogItem) return item.catalogItem.name;
  return null;
}
