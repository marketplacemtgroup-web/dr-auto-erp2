import BrandLogo, { type BrandLogoContext } from "./BrandLogo";
import BrandTagline from "./BrandTagline";

type BrandHeaderProps = {
  context?: BrandLogoContext;
  className?: string;
  subtitle?: string;
  align?: "left" | "center";
  taglineVariant?: "muted" | "light";
  showTagline?: boolean;
};

export default function BrandHeader({
  context = "auth",
  className = "",
  subtitle,
  align = "center",
  taglineVariant = "muted",
  showTagline = true,
}: BrandHeaderProps) {
  const alignClass = align === "center" ? "items-center text-center" : "items-start text-left";

  return (
    <div
      className={`flex flex-col ${alignClass} w-full ${subtitle ? "gap-2" : ""} ${className}`}
    >
      <div className={`brand-header-mark brand-header-mark--${context} flex flex-col ${alignClass}`}>
        <BrandLogo context={context} />
        {showTagline ? (
          <BrandTagline
            variant={taglineVariant}
            align={align}
            compact={context === "dashboard"}
          />
        ) : null}
      </div>
      {subtitle ? (
        <span className="text-[#94A3B8] text-[9px] uppercase tracking-widest">{subtitle}</span>
      ) : null}
    </div>
  );
}
