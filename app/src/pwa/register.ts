import { registerSW } from "virtual:pwa-register";

/** Registra o service worker em dev e produção (PWA instalável). */
export function setupPwa() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Nova versão publicada: recarrega para buscar chunks/CSS atuais.
      void updateSW(true);
    },
    onRegisteredSW(swUrl, registration) {
      if (import.meta.env.DEV) {
        console.info("[PWA] Service worker registrado:", swUrl, registration);
      }
      registration?.update().catch(() => undefined);
    },
    onRegisterError(error) {
      console.error("[PWA] Falha ao registrar service worker:", error);
    },
  });
}
