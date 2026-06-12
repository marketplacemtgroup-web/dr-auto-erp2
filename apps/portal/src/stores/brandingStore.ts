import { create } from "zustand";
import { branding as staticBranding } from "../lib/branding";
import { resolveAssetUrl } from "../lib/assetUrl";

export interface PublicBranding {
  name: string | null;
  tradeName: string | null;
  logoUrl: string | null;
  primaryColor?: string;
  accentColor?: string;
}

interface BrandingState {
  loaded: boolean;
  logoUrl: string;
  appName: string;
  apply: (data: PublicBranding | null | undefined) => void;
  reset: () => void;
}

function toDisplay(data: PublicBranding | null | undefined) {
  const name = data?.tradeName?.trim() || data?.name?.trim() || staticBranding.appName;
  const resolved = resolveAssetUrl(data?.logoUrl) ?? staticBranding.logoUrl;
  return { appName: name, logoUrl: resolved };
}

export const useBrandingStore = create<BrandingState>((set) => ({
  loaded: false,
  logoUrl: staticBranding.logoUrl,
  appName: staticBranding.appName,
  apply: (data) => {
    const next = toDisplay(data);
    set({ ...next, loaded: true });
    document.title = `${next.appName} - ${staticBranding.appTagline}`;
  },
  reset: () =>
    set({
      loaded: false,
      logoUrl: staticBranding.logoUrl,
      appName: staticBranding.appName,
    }),
}));
