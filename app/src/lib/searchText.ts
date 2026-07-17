export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function matchesSearchFields(query: string, ...fields: (string | null | undefined)[]) {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const normalized = normalizeSearchText(trimmed);
  const haystack = normalizeSearchText(fields.filter(Boolean).join(" "));
  return haystack.includes(normalized);
}
