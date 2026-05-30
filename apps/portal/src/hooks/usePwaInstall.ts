import { useCallback, useEffect, useState } from "react";
import {
  canInstallPwa,
  isPwaInstalled,
  openNativeInstallDialog,
  subscribePwaInstall,
} from "../pwa/install";

/** Fallback: botão só se o diálogo automático não apareceu e o usuário ainda não instalou. */
export function usePwaInstall() {
  const [installable, setInstallable] = useState(canInstallPwa);
  const [installed, setInstalled] = useState(isPwaInstalled);

  const refresh = useCallback(() => {
    setInstallable(canInstallPwa());
    setInstalled(isPwaInstalled());
  }, []);

  useEffect(() => {
    refresh();
    return subscribePwaInstall(refresh);
  }, [refresh]);

  const promptInstall = useCallback(async () => {
    const result = await openNativeInstallDialog();
    refresh();
    return result;
  }, [refresh]);

  return { installable, installed, promptInstall, refresh };
}
