/** Rotas do dashboard ERP (app separado do portal do cliente). */
export const routes = {
  login: "/login",
  register: "/cadastro",
  dashboardHome: "/dashboard",
  admin: "/dashboard/admin",
  clientes: "/dashboard/clientes",
  clienteDetalhe: (id: string) => `/dashboard/clientes/${id}`,
  veiculos: "/dashboard/veiculos",
  veiculoDetalhe: (id: string) => `/dashboard/veiculos/${id}`,
  ordemDeServico: "/dashboard/ordem-de-servico",
  ordemDeServicoDetalhe: (id: string) => `/dashboard/ordem-de-servico/${id}`,
  orcamentos: "/dashboard/orcamentos",
  servicos: "/dashboard/servicos",
  agenda: "/dashboard/agenda",
  estoque: "/dashboard/estoque",
  compras: "/dashboard/compras",
  financeiro: "/dashboard/financeiro",
  relatorios: "/dashboard/relatorios",
  configuracoes: "/dashboard/configuracoes",
} as const;

export function portalBaseUrl() {
  return (import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "";
}

export function portalAccessUrl(accessToken: string) {
  const base = portalBaseUrl();
  return base ? `${base}/acesso/${accessToken}` : `/acesso/${accessToken}`;
}

export function portalPublicQuoteUrl(quoteToken: string) {
  const base = portalBaseUrl();
  return base ? `${base}/orcamento/${quoteToken}` : `/orcamento/${quoteToken}`;
}
