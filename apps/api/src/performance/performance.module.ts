import { Global, Module } from '@nestjs/common';
import { PerformanceInterceptor } from './performance.interceptor';
import { PerformanceLoggerService } from './performance-logger.service';
import { QueryCounterService } from './query-counter.service';

@Global()
@Module({
  providers: [PerformanceLoggerService, PerformanceInterceptor, QueryCounterService],
  exports: [PerformanceLoggerService, PerformanceInterceptor, QueryCounterService],
})
export class PerformanceModule {}
