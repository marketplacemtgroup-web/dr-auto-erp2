import { branding } from "../lib/branding";

type BrandTaglineProps = {
  className?: string;
  variant?: "muted" | "light";
  align?: "left" | "center";
  compact?: boolean;
};

function splitTagline(text: string): [string, string | null] {
  const idx = text.toLowerCase().indexOf(" em ");
  if (idx === -1) return [text, null];
  return [text.slice(0, idx).trim(), text.slice(idx + 4).trim()];
}

export default function BrandTagline({
  className = "",
  variant = "muted",
  align = "left",
  compact = false,
}: BrandTaglineProps) {
  const [lead, tail] = splitTagline(branding.appTagline);
  const centered = align === "center" ? "text-center mx-auto" : "text-left";
  const accent = variant === "light" ? "text-cyan-400" : "text-[#0E7490]";
  const headline = variant === "light" ? "text-white" : "text-[#0F172A]";

  if (tail) {
    return (
      <div
        className={[
          "brand-tagline m-0 font-sans antialiased",
          compact ? "max-w-[13rem]" : "max-w-[260px]",
          centered,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span
          className={[
            "block font-semibold uppercase",
            accent,
            compact ? "text-[9px] tracking-[0.14em]" : "text-[11px] tracking-[0.16em]",
          ].join(" ")}
        >
          {lead}
        </span>
        <span
          className={[
            "mt-0.5 block font-extrabold uppercase",
            headline,
            compact ? "text-[10px] tracking-[0.06em]" : "text-sm tracking-[0.05em]",
          ].join(" ")}
        >
          Em {tail}
        </span>
      </div>
    );
  }

  return (
    <p
      className={[
        "brand-tagline m-0 font-sans text-sm font-extrabold uppercase tracking-[0.06em] antialiased",
        compact ? "text-[10px] max-w-[13rem]" : "max-w-[260px]",
        centered,
        headline,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {lead}
    </p>
  );
}
