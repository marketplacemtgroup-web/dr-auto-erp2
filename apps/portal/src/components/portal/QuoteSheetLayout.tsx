import type { ReactNode } from "react";
import { branding } from "../../lib/branding";
import { useBrandingStore } from "../../stores/brandingStore";

type QuoteSheetLayoutProps = {
  organizationName: string;
  customerName?: string;
  vehiclePlate?: string;
  headerAction?: ReactNode;
  backLink?: ReactNode;
  children: ReactNode;
};

export default function QuoteSheetLayout({
  organizationName,
  customerName,
  vehiclePlate,
  headerAction,
  backLink,
  children,
}: QuoteSheetLayoutProps) {
  const logoUrl = useBrandingStore((s) => s.logoUrl);
  const subtitle =
    customerName && vehiclePlate
      ? `${customerName} · ${vehiclePlate}`
      : customerName ?? vehiclePlate ?? null;

  return (
    <div className="quote-sheet min-h-screen relative">
      <div
        className="portal-bg__image absolute inset-0"
        style={{ backgroundImage: `url("${encodeURI(branding.backgroundUrl)}")` }}
        aria-hidden
      />
      <div className="portal-bg__overlay absolute inset-0" aria-hidden />
      <div className="relative z-10 min-h-screen flex flex-col">
        <header
          className="quote-sheet__header bg-[#0F3D4C] text-white px-4 py-5 print:hidden safe-area-top"
        >
          <div className="max-w-lg mx-auto">
            {backLink ? <div className="mb-3">{backLink}</div> : null}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <img
                  src={logoUrl}
                  alt=""
                  className="h-10 w-auto object-contain shrink-0 bg-white/10 rounded-lg p-1"
                />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-white/70">
                    Orçamento online
                  </p>
                  <h1 className="text-lg font-semibold mt-0.5 truncate">{organizationName}</h1>
                  {subtitle ? (
                    <p className="text-sm text-white/80 mt-1 truncate">{subtitle}</p>
                  ) : null}
                </div>
              </div>
              {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
            </div>
          </div>
        </header>

        <div className="hidden print:block px-4 py-3 border-b border-[#E2E8F0] bg-white">
          <p className="text-xs uppercase text-[#64748B]">Orçamento online</p>
          <h1 className="text-lg font-semibold">{organizationName}</h1>
          {subtitle ? <p className="text-sm text-[#64748B]">{subtitle}</p> : null}
        </div>

        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5 space-y-4 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
