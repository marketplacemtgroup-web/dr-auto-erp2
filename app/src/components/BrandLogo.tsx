import { branding } from "../lib/branding";

const sizeClass = {
  sm: "w-[108px] h-[108px]",
  md: "w-[120px] h-[120px]",
} as const;

const sizePx = {
  sm: 108,
  md: 120,
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
        width={sizePx[size]}
        height={sizePx[size]}
        className="w-full h-full object-contain"
        decoding="async"
      />
    </div>
  );
}
