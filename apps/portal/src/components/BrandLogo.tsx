import { branding, resolveBrandingLogoUrl } from "../lib/branding";
import { useBrandingStore } from "../stores/brandingStore";

export type BrandLogoContext = "auth" | "dashboard" | "compact";

type BrandLogoProps = {
  context?: BrandLogoContext;
  className?: string;
};

export default function BrandLogo({ context = "auth", className = "" }: BrandLogoProps) {
  const logoUrl = useBrandingStore((s) => s.logoUrl);
  const appName = useBrandingStore((s) => s.appName);

  return (
    <div
      className={`brand-logo brand-logo--${context} shrink-0 flex items-end justify-center max-w-full leading-none ${className}`}
    >
      <img
        src={resolveBrandingLogoUrl(logoUrl || branding.logoUrl)}
        alt={appName || branding.appName}
        className="brand-logo__img w-full h-auto object-contain object-bottom block"
        decoding="async"
        loading="eager"
      />
    </div>
  );
}
