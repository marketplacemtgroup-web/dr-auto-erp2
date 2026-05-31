import { useCallback, useEffect, useState } from "react";
import {
  canInstallPwa,
  getDeferredInstallPrompt,
  isPwaInstalled,
  promptPwaInstall,
  subscribePwaInstall,
} from "../pwa/install";

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
    const result = await promptPwaInstall();
    refresh();
    return result;
  }, [refresh]);

  return {
    installable,
    installed,
    hasNativePrompt: getDeferredInstallPrompt() !== null,
    promptInstall,
    refresh,
  };
}
