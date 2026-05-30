export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const INSTALL_EVENT = "scalibur-pwa-install";
const SESSION_KEY = "portal-pwa-install-dialog-shown";

let deferred: BeforeInstallPromptEvent | null = null;
let prompting = false;

export function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
}

export function isPwaInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function canInstallPwa() {
  return !isPwaInstalled() && deferred !== null;
}

export function getDeferredInstallPrompt() {
  return deferred;
}

export function subscribePwaInstall(listener: () => void) {
  window.addEventListener(INSTALL_EVENT, listener);
  return () => window.removeEventListener(INSTALL_EVENT, listener);
}

/** Abre o diálogo nativo do navegador: "Instalar app?" Sim / Não */
export async function openNativeInstallDialog(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (isPwaInstalled() || !deferred || prompting) return "unavailable";
  if (sessionStorage.getItem(SESSION_KEY) === "1") return "unavailable";

  prompting = true;
  try {
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    sessionStorage.setItem(SESSION_KEY, "1");
    if (outcome === "accepted") deferred = null;
    return outcome;
  } catch {
    return "unavailable";
  } finally {
    prompting = false;
  }
}

async function waitForServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.ready;
  } catch {
    /* ignore */
  }
}

/** Dispara o diálogo assim que o Chrome liberar a instalação (beforeinstallprompt). */
export async function tryOpenInstallDialogWhenReady() {
  if (isPwaInstalled() || isIosSafari()) return;
  if (!window.isSecureContext) return;

  await waitForServiceWorker();
  await new Promise((r) => setTimeout(r, 600));

  if (deferred) {
    await openNativeInstallDialog();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event(INSTALL_EVENT));
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    sessionStorage.setItem(SESSION_KEY, "1");
    window.dispatchEvent(new Event(INSTALL_EVENT));
  });
}
