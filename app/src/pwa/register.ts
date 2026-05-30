import { registerSW } from "virtual:pwa-register";

/** Registra o service worker em dev e produção (PWA instalável). */
export function setupPwa() {
  registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      if (import.meta.env.DEV) {
        console.info("[PWA] Service worker registrado:", swUrl, registration);
      }
    },
    onRegisterError(error) {
      console.error("[PWA] Falha ao registrar service worker:", error);
    },
  });
}
