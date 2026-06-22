export type ChecklistResult = "OK" | "ATTENTION" | "DAMAGED" | "NA";

export const CHECKLIST_CATEGORY_LABELS: Record<string, string> = {
  external: "Externo",
  internal: "Interno",
  mechanical: "Mecânico",
  tires: "Pneus",
};

export const CHECKLIST_RESULT_LABELS: Record<ChecklistResult, string> = {
  OK: "OK",
  ATTENTION: "Atenção",
  DAMAGED: "Avariado",
  NA: "N/A",
};

export function checklistResultVariant(
  result: ChecklistResult | null | undefined,
): "success" | "warning" | "danger" | "muted" {
  switch (result) {
    case "OK":
      return "success";
    case "ATTENTION":
      return "warning";
    case "DAMAGED":
      return "danger";
    default:
      return "muted";
  }
}

export function groupChecklistByCategory<
  T extends { category: string; sortOrder?: number },
>(items: T[]) {
  const order = ["external", "internal", "tires", "mechanical"];
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }
  return order
    .filter((key) => groups.has(key))
    .map((key) => ({
      key,
      label: CHECKLIST_CATEGORY_LABELS[key] ?? key,
      items: groups.get(key)!,
    }));
}
