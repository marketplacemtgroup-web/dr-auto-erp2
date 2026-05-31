import { useEffect } from "react";
import {
  isIosSafari,
  isPwaInstalled,
  openNativeInstallDialog,
  subscribePwaInstall,
} from "../pwa/install";

/** Só em produção e só na tela de login — não bloqueia navegação no dev. */
export function useAutoPwaInstallPrompt(enabled = true) {
  useEffect(() => {
    if (!enabled || import.meta.env.DEV || isPwaInstalled() || isIosSafari()) return;

    const t = window.setTimeout(() => {
      void openNativeInstallDialog();
    }, 1500);

    const unsub = subscribePwaInstall(() => {
      void openNativeInstallDialog();
    });

    return () => {
      window.clearTimeout(t);
      unsub();
    };
  }, [enabled]);
}
