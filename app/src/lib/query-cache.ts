/** Tempo em que os dados são considerados frescos (sem nova requisição ao reabrir a tela). */
export const QUERY_STALE_TIME_MS = 30 * 60_000;

/** Tempo que dados ficam na memória após sair da tela (deve ser >= staleTime). */
export const QUERY_GC_TIME_MS = 60 * 60_000;
