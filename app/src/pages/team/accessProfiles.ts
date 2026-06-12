export const ACCESS_PROFILE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "gerente", label: "Gerente" },
  { value: "recepcao", label: "Recepção" },
  { value: "mecanico", label: "Mecânico" },
  { value: "estoque", label: "Estoque" },
  { value: "financeiro", label: "Financeiro" },
  { value: "vendedor", label: "Vendedor" },
  { value: "consulta", label: "Consulta (somente leitura)" },
] as const;

export function accessProfileLabel(slug: string | null | undefined): string {
  if (!slug) return "—";
  return ACCESS_PROFILE_OPTIONS.find((o) => o.value === slug)?.label ?? slug;
}
