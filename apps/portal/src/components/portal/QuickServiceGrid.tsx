import type { LucideIcon } from "lucide-react";

function QuickItem({
  title,
  icon: Icon,
  onClick,
}: {
  title: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="portal-card flex flex-col items-center justify-center gap-2 p-4 min-h-[88px] transition-shadow hover:shadow-md"
    >
      <Icon size={24} style={{ color: "var(--portal-accent)" }} />
      <span className="portal-text text-xs font-semibold text-center leading-tight">{title}</span>
    </button>
  );
}

export default function QuickServiceGrid({
  items,
}: {
  items: Array<{ title: string; icon: LucideIcon; onClick: () => void }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <QuickItem key={item.title} {...item} />
      ))}
    </div>
  );
}
