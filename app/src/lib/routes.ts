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
  orcamentoDetalhe: (id: string) => `/dashboard/orcamentos/${id}`,
  servicos: "/dashboard/servicos",
  agenda: "/dashboard/agenda",
  estoque: "/dashboard/estoque",
  compras: "/dashboard/compras",
  financeiro: "/dashboard/financeiro",
  relatorios: "/dashboard/relatorios",
  configuracoes: "/dashboard/configuracoes",
  equipe: "/dashboard/equipe",
  equipeFuncionarios: "/dashboard/equipe/funcionarios",
  equipeFuncionarioDetalhe: (id: string) => `/dashboard/equipe/funcionarios/${id}`,
  equipeCargos: "/dashboard/equipe/cargos",
  equipePermissoes: "/dashboard/equipe/permissoes",
  equipeRegrasComissao: "/dashboard/equipe/regras-comissao",
  equipeLancamentos: "/dashboard/equipe/lancamentos",
  equipeFechamentos: "/dashboard/equipe/fechamentos",
  equipeProdutividade: "/dashboard/equipe/produtividade",
  equipeRelatorios: "/dashboard/equipe/relatorios",
} as const;

/** Portal público do cliente — links enviados por WhatsApp sempre apontam aqui. */
export const PORTAL_PUBLIC_BASE_URL = "https://wtecmotors-portal.vercel.app";

export function portalBaseUrl() {
  const configured = (import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim().replace(/\/$/, "");
  if (configured) return configured;
  return PORTAL_PUBLIC_BASE_URL;
}

export function portalLoginUrl() {
  return `${portalBaseUrl()}/login`;
}

export function portalAccessUrl(accessToken: string) {
  return `${portalBaseUrl()}/acesso/${accessToken}`;
}

export function portalPublicQuoteUrl(quoteToken: string) {
  return `${portalBaseUrl()}/orcamento/${quoteToken}`;
}
