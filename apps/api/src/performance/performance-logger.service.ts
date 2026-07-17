import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Injectable, Logger } from '@nestjs/common';

export type PerformanceLogEntry = {
  endpoint: string;
  method: string;
  durationMs: number;
  recordCount: number;
  queryCount: number;
  statusCode: number;
  timestamp: string;
};

@Injectable()
export class PerformanceLoggerService {
  private readonly logger = new Logger('PERFORMANCE_LOGGER');
  private readonly logPath = join(process.cwd(), 'performance.log');

  log(entry: PerformanceLogEntry) {
    const line = JSON.stringify(entry);
    this.logger.debug(
      `${entry.method} ${entry.endpoint} ${entry.durationMs}ms records=${entry.recordCount} queries=${entry.queryCount}`,
    );
    try {
      const dir = join(process.cwd());
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(this.logPath, `${line}\n`, 'utf8');
    } catch {
      /* serverless read-only FS */
    }
  }
}
