export type PrintDocumentMode = "os" | "quote" | "reports";

export function printDocument(mode: PrintDocumentMode) {
  const bodyClass = `printing-${mode}`;
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
