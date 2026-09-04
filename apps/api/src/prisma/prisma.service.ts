import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@autocore/database';

/**
 * Prisma + pooler (DATABASE_URL :6543?pgbouncer=true) para queries normais.
 * Transações interativas usam DIRECT_URL (session/direct) — PgBouncer em
 * transaction mode não sustenta $transaction(async tx => ...).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private directClient: PrismaClient | null = null;

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (this.directClient) {
      await this.directClient.$disconnect();
      this.directClient = null;
    }
  }

  private getDirectClient(): PrismaClient {
    if (this.directClient) return this.directClient;
    const url = (process.env.DIRECT_URL || process.env.DATABASE_URL || '').trim();
    this.directClient = new PrismaClient({
      datasources: { db: { url } },
    });
    return this.directClient;
  }

  /** Transação interativa compatível com Supabase (usa DIRECT_URL). */
  $transactionSafe<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number },
  ): Promise<T> {
    return this.getDirectClient().$transaction(fn, {
      maxWait: options?.maxWait ?? 15_000,
      timeout: options?.timeout ?? 30_000,
    });
  }
}
