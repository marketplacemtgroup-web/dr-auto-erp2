import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { extractRecordCount, getPrismaQueryCount, logPerformance } from './performance-logger';
import { runWithPerfContext } from './perf-context';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<{
      method?: string;
      url?: string;
      user?: { organizationId?: string };
    }>();
    const requestId = randomUUID();
    const started = Date.now();
    const method = req.method ?? 'UNKNOWN';
    const endpoint = req.url?.split('?')[0] ?? 'unknown';

    return new Observable((subscriber) => {
      runWithPerfContext(requestId, () => {
        next.handle().subscribe({
          next: (body) => {
            const res = http.getResponse<{ statusCode?: number }>();
            logPerformance({
              endpoint,
              method,
              durationMs: Date.now() - started,
              recordCount: extractRecordCount(body),
              organizationId: req.user?.organizationId,
              prismaQueryCount: getPrismaQueryCount(),
              statusCode: res.statusCode ?? 200,
            });
            subscriber.next(body);
            subscriber.complete();
          },
          error: (err) => {
            const res = http.getResponse<{ statusCode?: number }>();
            logPerformance({
              endpoint,
              method,
              durationMs: Date.now() - started,
              organizationId: req.user?.organizationId,
              prismaQueryCount: getPrismaQueryCount(),
              statusCode: res.statusCode ?? 500,
            });
            subscriber.error(err);
          },
        });
      });
    });
  }
}
