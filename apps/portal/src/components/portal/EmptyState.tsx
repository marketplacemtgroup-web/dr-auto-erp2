import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <Icon size={48} className="portal-text-muted mb-4 opacity-50" strokeWidth={1.5} />
      <p className="portal-text text-base font-bold">{title}</p>
      {description ? (
        <p className="portal-text-muted text-sm mt-2 max-w-xs">{description}</p>
      ) : null}
    </div>
  );
}
