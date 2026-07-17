import { Logger } from '@nestjs/common';

export type PerformanceLogEntry = {
  endpoint: string;
  method: string;
  durationMs: number;
  recordCount?: number;
  organizationId?: string;
  prismaQueryCount?: number;
  statusCode: number;
};

const logger = new Logger('PERFORMANCE_LOGGER');

import { getPrismaQueryFromContext } from './perf-context';

export function getPrismaQueryCount(_requestId?: string): number {
  return getPrismaQueryFromContext();
}

export function logPerformance(entry: PerformanceLogEntry) {
  logger.log(
    JSON.stringify({
      type: 'performance',
      endpoint: entry.endpoint,
      method: entry.method,
      durationMs: entry.durationMs,
      recordCount: entry.recordCount ?? null,
      organizationId: entry.organizationId ?? null,
      prismaQueryCount: entry.prismaQueryCount ?? null,
      statusCode: entry.statusCode,
    }),
  );
}

export function extractRecordCount(body: unknown): number | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const obj = body as Record<string, unknown>;
  if (Array.isArray(obj.data) && obj.pagination && typeof obj.pagination === 'object') {
    const pagination = obj.pagination as Record<string, unknown>;
    if (typeof pagination.total === 'number') return pagination.total;
    return obj.data.length;
  }
  if (Array.isArray(body)) return body.length;
  return undefined;
}
