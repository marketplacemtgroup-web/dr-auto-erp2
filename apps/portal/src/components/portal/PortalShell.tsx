import type { ReactNode } from "react";
import BrandLogo from "../BrandLogo";
import PortalPushBanner from "./PortalPushBanner";

export default function PortalShell({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-10">
      <header className="bg-[#0F3D4C] text-white px-4 py-5 safe-area-top">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <BrandLogo context="compact" />
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/70">Portal do Cliente</p>
            {title ? <h1 className="text-lg font-semibold mt-0.5">{title}</h1> : null}
            {subtitle ? <p className="text-sm text-white/80 mt-1">{subtitle}</p> : null}
          </div>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <PortalPushBanner />
        {children}
      </main>
    </div>
  );
}
