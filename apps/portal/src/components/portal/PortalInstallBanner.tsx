import { Download } from "lucide-react";
import { usePwaInstall } from "../../hooks/usePwaInstall";
import { isIosSafari } from "../../pwa/install";

/**
 * Só aparece se o diálogo automático não rodou mas o Chrome ainda permite instalar.
 * Não mostra instruções de “adicionar à área de trabalho” no Android.
 */
export default function PortalInstallBanner() {
  const { installable, installed, promptInstall } = usePwaInstall();

  if (installed || isIosSafari() || !installable) return null;

  return (
    <button
      type="button"
      className="w-full h-11 rounded-lg border border-[#0E7490] bg-[#ECFEFF] text-[#0E7490] text-sm font-semibold flex items-center justify-center gap-2"
      onClick={() => void promptInstall()}
    >
      <Download size={18} />
      Instalar aplicativo
    </button>
  );
}
