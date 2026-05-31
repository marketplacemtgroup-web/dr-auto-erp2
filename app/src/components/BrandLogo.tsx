import { branding } from "../lib/branding";

const sizeClass = {
  sm: "w-9 h-9",
  md: "w-10 h-10",
} as const;

type BrandLogoProps = {
  size?: keyof typeof sizeClass;
  className?: string;
};

/** Logo PNG transparente (public/sem fundo.png) */
export default function BrandLogo({ size = "sm", className = "" }: BrandLogoProps) {
  return (
    <div
      className={`${sizeClass[size]} shrink-0 rounded-lg flex items-center justify-center overflow-hidden ${className}`}
    >
      <img
        src={branding.logoUrl}
        alt={branding.appName}
        width={size === "md" ? 40 : 36}
        height={size === "md" ? 40 : 36}
        className="w-full h-full object-contain"
        decoding="async"
      />
    </div>
  );
}
