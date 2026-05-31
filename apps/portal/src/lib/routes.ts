/** Rotas do app portal (domínio/porta separados do dashboard ERP). */
export const routes = {
  home: "/",
  login: "/login",
  access: (token: string) => `/acesso/${token}`,
  serviceOrder: (id: string) => `/os/${id}`,
  orcamentoPublico: (token: string) => `/orcamento/${token}`,
} as const;

export function dashboardLoginUrl() {
  const base = (import.meta.env.VITE_DASHBOARD_URL as string | undefined)?.trim().replace(/\/$/, "");
  return base ? `${base}/login` : "/login";
}
