import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, lastValueFrom, map, tap } from 'rxjs';
import { PerformanceLoggerService } from './performance-logger.service';
import { QueryCounterService } from './query-counter.service';

function estimateRecordCount(body: unknown): number {
  if (body == null) return 0;
  if (Array.isArray(body)) return body.length;
  if (typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items.length;
    if (Array.isArray(obj.data)) return obj.data.length;
  }
  return 1;
}

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(
    private readonly perf: PerformanceLoggerService,
    private readonly queryCounter: QueryCounterService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const started = Date.now();
    const req = context.switchToHttp().getRequest<{ method?: string; url?: string }>();
    const res = context.switchToHttp().getResponse<{ statusCode?: number }>();
    const method = req.method ?? 'GET';
    const endpoint = (req.url ?? '').split('?')[0];

    return from(
      this.queryCounter.runWithCounter(async () => lastValueFrom(next.handle())),
    ).pipe(
      tap(({ result, queryCount }) => {
        this.perf.log({
          endpoint,
          method,
          durationMs: Date.now() - started,
          recordCount: estimateRecordCount(result),
          queryCount,
          statusCode: res.statusCode ?? 200,
          timestamp: new Date().toISOString(),
        });
      }),
      map(({ result }) => result),
    );
  }
}
