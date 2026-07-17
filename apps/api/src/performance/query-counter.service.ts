import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

type QueryStore = { count: number };

const storage = new AsyncLocalStorage<QueryStore>();

@Injectable()
export class QueryCounterService {
  runWithCounter<T>(fn: () => Promise<T>): Promise<{ result: T; queryCount: number }> {
    const store: QueryStore = { count: 0 };
    return storage.run(store, async () => {
      const result = await fn();
      return { result, queryCount: store.count };
    });
  }

  increment() {
    const store = storage.getStore();
    if (store) store.count++;
  }

  currentCount() {
    return storage.getStore()?.count ?? 0;
  }
}

export function getQueryCounterStore() {
  return storage.getStore();
}
