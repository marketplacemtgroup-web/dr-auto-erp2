/** Rotas do app portal (domínio/porta separados do dashboard ERP). */
export const routes = {
  splash: "/splash",
  home: "/",
  login: "/login",
  orders: "/os",
  notifications: "/notificacoes",
  profile: "/perfil",
  profileSupport: "/perfil/suporte",
  profileData: "/perfil/dados",
  profileVehicles: "/perfil/veiculos",
  profileHistory: "/perfil/historico",
  profilePrivacy: "/perfil/privacidade",
  access: (token: string) => `/acesso/${token}`,
  serviceOrder: (id: string) => `/os/${id}`,
  orcamentoPublico: (token: string) => `/orcamento/${token}`,
} as const;

export function dashboardLoginUrl() {
  const base = (import.meta.env.VITE_DASHBOARD_URL as string | undefined)?.trim().replace(/\/$/, "");
  return base ? `${base}/login` : "/login";
}
