export type PortalQuoteTab = "orcamento" | "observacoes" | "fotos";

type PortalQuotePageTabsProps = {
  active: PortalQuoteTab;
  onChange: (tab: PortalQuoteTab) => void;
  photoCount: number;
  hasObservations: boolean;
  variant?: "sheet" | "portal";
};

export default function PortalQuotePageTabs({
  active,
  onChange,
  photoCount,
  hasObservations,
  variant = "sheet",
}: PortalQuotePageTabsProps) {
  const isPortal = variant === "portal";

  return (
    <div
      className={
        isPortal
          ? "flex gap-1 p-1 rounded-xl border mb-0"
          : "flex gap-1 p-1 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] mb-4"
      }
      style={
        isPortal
          ? { borderColor: "var(--portal-border)", backgroundColor: "var(--portal-card-bg, #F8FAFC)" }
          : undefined
      }
    >
      {(
        [
          ["orcamento", "Orçamento"],
          ["observacoes", "Observações"],
          ["fotos", "Fotos"],
        ] as const
      ).map(([id, label]) => {
        const selected = active === id;
        const badge =
          id === "observacoes" && hasObservations
            ? 1
            : id === "fotos" && photoCount > 0
              ? photoCount
              : 0;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-colors ${
              selected
                ? isPortal
                  ? "portal-text shadow-sm"
                  : "bg-white text-[#1E293B] shadow-sm"
                : isPortal
                  ? "portal-text-muted"
                  : "text-[#64748B]"
            }`}
            style={
              selected && isPortal
                ? { backgroundColor: "var(--portal-surface, #fff)" }
                : undefined
            }
          >
            {label}
            {badge ? (
              <span
                className={`ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 text-[11px] font-bold text-white ${
                  isPortal ? "" : "bg-[#0F3D4C]"
                }`}
                style={isPortal ? { backgroundColor: "var(--portal-primary)" } : undefined}
              >
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
