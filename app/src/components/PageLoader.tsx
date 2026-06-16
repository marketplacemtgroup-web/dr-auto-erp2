/** Fallback mínimo para rotas lazy — não bloqueia a tela inteira. */
export default function PageLoader() {
  return <div className="min-h-[12vh]" aria-busy="true" />;
}
