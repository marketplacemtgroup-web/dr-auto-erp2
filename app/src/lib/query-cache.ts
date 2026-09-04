import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";

/** Tempo em que os dados são considerados frescos (sem nova requisição ao reabrir a tela). */
export const QUERY_STALE_TIME_MS = 30 * 60_000;

/** Tempo que dados ficam na memória / IndexedDB após sair da tela (deve ser >= staleTime). */
export const QUERY_GC_TIME_MS = 60 * 60_000;

/** Chave IndexedDB do cache React Query (limpar no logout). */
export const QUERY_PERSIST_KEY = "autocore-rq-v1";

/** Descarte cache persistido mais antigo que o GC (evita dados velhos pós-deploy). */
export const QUERY_PERSIST_MAX_AGE_MS = QUERY_GC_TIME_MS;

/** Buster: mude ao alterar formato de respostas críticas. */
export const QUERY_PERSIST_BUSTER = "v1";

let appQueryClient: QueryClient | null = null;

export function createAppQueryClient() {
  if (appQueryClient) return appQueryClient;
  appQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 0,
        refetchOnWindowFocus: false,
        staleTime: QUERY_STALE_TIME_MS,
        gcTime: QUERY_GC_TIME_MS,
      },
    },
  });
  return appQueryClient;
}

export function getAppQueryClient() {
  return appQueryClient ?? createAppQueryClient();
}

export function createQueryPersister() {
  return createAsyncStoragePersister({
    key: QUERY_PERSIST_KEY,
    throttleTime: 1000,
    storage: {
      getItem: async (key) => (await get<string>(key)) ?? null,
      setItem: async (key, value) => {
        await set(key, value);
      },
      removeItem: async (key) => {
        await del(key);
      },
    },
  });
}

/** Remove cache em memória + IndexedDB (logout / troca de conta). */
export async function clearPersistedQueryCache(client?: QueryClient) {
  (client ?? appQueryClient)?.clear();
  try {
    await del(QUERY_PERSIST_KEY);
  } catch {
    // IndexedDB pode falhar em modo privado — logout não deve quebrar.
  }
}
