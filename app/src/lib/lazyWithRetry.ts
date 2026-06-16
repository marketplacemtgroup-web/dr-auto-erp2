import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const RELOAD_KEY = "wtec:chunk-reload";

/**
 * Evita tela branca quando um deploy novo troca os hashes dos chunks
 * e o navegador/PWA ainda referencia arquivos antigos (404 em assets/*.js).
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      const isChunkError =
        error instanceof TypeError &&
        /Failed to fetch dynamically imported module|Importing a module script failed/i.test(
          error.message,
        );

      if (isChunkError && !sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
        await new Promise(() => undefined);
      }

      throw error;
    }
  });
}

export function setupChunkReloadHandlers() {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    if (!sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    }
  });

  window.addEventListener("load", () => {
    sessionStorage.removeItem(RELOAD_KEY);
  });
}
