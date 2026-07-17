import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type MemoryEntry = { value: string; expiresAt: number };

/** Cache distribuído com fallback in-memory (L1) + Redis opcional (L2). */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly memory = new Map<string, MemoryEntry>();
  private redis: import('ioredis').default | null = null;
  private redisReady = false;

  constructor(private readonly config: ConfigService) {
    void this.initRedis();
  }

  private async initRedis() {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) return;
    try {
      const { default: Redis } = await import('ioredis');
      this.redis = new Redis(url, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
        connectTimeout: 5000,
      });
      await this.redis.connect();
      this.redisReady = true;
      this.logger.log('Redis conectado');
    } catch (err) {
      this.logger.warn(
        `Redis indisponível — usando cache in-memory: ${err instanceof Error ? err.message : err}`,
      );
      this.redis = null;
      this.redisReady = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const mem = this.readMemory(key);
    if (mem != null) {
      try {
        return JSON.parse(mem) as T;
      } catch {
        return null;
      }
    }
    if (!this.redisReady || !this.redis) return null;
    try {
      const raw = await this.redis.get(key);
      if (raw == null) return null;
      this.writeMemory(key, raw, 60_000);
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    const raw = JSON.stringify(value);
    this.writeMemory(key, raw, ttlMs);
    if (!this.redisReady || !this.redis) return;
    try {
      await this.redis.set(key, raw, 'PX', ttlMs);
    } catch (err) {
      this.logger.debug(`Redis SET falhou (${key}): ${err instanceof Error ? err.message : err}`);
    }
  }

  async del(key: string): Promise<void> {
    this.memory.delete(key);
    if (!this.redisReady || !this.redis) return;
    try {
      await this.redis.del(key);
    } catch {
      /* ignore */
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    for (const key of [...this.memory.keys()]) {
      if (key.startsWith(prefix)) this.memory.delete(key);
    }
    if (!this.redisReady || !this.redis) return;
    try {
      const pattern = `${prefix}*`;
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length) await this.redis.del(...keys);
      } while (cursor !== '0');
    } catch {
      /* ignore */
    }
  }

  async getOrSet<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached != null) return cached;
    const value = await factory();
    await this.set(key, value, ttlMs);
    return value;
  }

  cacheKey(...parts: (string | number | undefined | null)[]): string {
    return parts.filter((p) => p != null && p !== '').join(':');
  }

  private readMemory(key: string): string | null {
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  private writeMemory(key: string, value: string, ttlMs: number) {
    this.memory.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  onModuleDestroy() {
    void this.redis?.quit();
  }
}

/** TTLs sugeridos (ms). */
export const CACHE_TTL = {
  dashboard: 5 * 60_000,
  financial: 15 * 60_000,
  inventory: 5 * 60_000,
  branding: 24 * 60 * 60_000,
  config: 24 * 60 * 60_000,
  portal: 5 * 60_000,
  signedUrl: 23 * 60 * 60_000,
} as const;
