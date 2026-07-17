import { AsyncLocalStorage } from 'async_hooks';

type RequestPerfContext = {
  requestId: string;
  prismaQueryCount: number;
};

export const perfContext = new AsyncLocalStorage<RequestPerfContext>();

export function runWithPerfContext<T>(requestId: string, fn: () => T): T {
  return perfContext.run({ requestId, prismaQueryCount: 0 }, fn);
}

export function incrementPrismaQueryInContext() {
  const ctx = perfContext.getStore();
  if (ctx) ctx.prismaQueryCount += 1;
}

export function getPrismaQueryFromContext(): number {
  return perfContext.getStore()?.prismaQueryCount ?? 0;
}
