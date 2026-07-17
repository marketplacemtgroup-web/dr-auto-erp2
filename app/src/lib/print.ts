export type PrintDocumentMode = "os" | "quote" | "reports";

function printRootSelector(mode: PrintDocumentMode) {
  if (mode === "os") return ".service-order-print";
  if (mode === "quote") return ".quote-print";
  return ".reports-print";
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

async function waitForPrintImagesReady(rootSelector: string, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const root = document.querySelector(rootSelector);
    if (!root) {
      await sleep(50);
      continue;
    }
    const ready = root.getAttribute("data-print-images-ready");
    // Folhas sem marcador (ex.: reports) seguem direto.
    if (ready === null || ready === "1") break;
    await sleep(80);
  }
}

async function waitForImagesToLoad(rootSelector: string, timeoutMs = 8000) {
  const root = document.querySelector(rootSelector);
  if (!root) return;

  const images = Array.from(root.querySelectorAll("img")).filter((img) => {
    const src = img.getAttribute("src")?.trim();
    return Boolean(src);
  });

  if (images.length === 0) return;

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          window.setTimeout(done, timeoutMs);
        }),
    ),
  );
}

export async function printDocument(mode: PrintDocumentMode) {
  const bodyClass = `printing-${mode}`;
  const rootSelector = printRootSelector(mode);

  await waitForPrintImagesReady(rootSelector);
  await waitForImagesToLoad(rootSelector);

  document.body.classList.add(bodyClass);

  const cleanup = () => {
    document.body.classList.remove(bodyClass);
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);

  // Aguarda o browser aplicar a classe antes de abrir o dialogo de impressao.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  });
}
