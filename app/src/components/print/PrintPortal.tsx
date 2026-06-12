import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/** Renderiza conteudo de impressao direto no body, fora do shell do ERP. */
export default function PrintPortal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
