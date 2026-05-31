export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const INSTALL_EVENT = "scalibur-pwa-install";

let deferred: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event(INSTALL_EVENT));
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    window.dispatchEvent(new Event(INSTALL_EVENT));
  });
}

export function getDeferredInstallPrompt() {
  return deferred;
}

export function subscribePwaInstall(listener: () => void) {
  window.addEventListener(INSTALL_EVENT, listener);
  return () => window.removeEventListener(INSTALL_EVENT, listener);
}

export function isPwaInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function canInstallPwa() {
  return !isPwaInstalled() && deferred !== null;
}

export async function promptPwaInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred) return "unavailable";
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  if (outcome === "accepted") deferred = null;
  return outcome;
}
