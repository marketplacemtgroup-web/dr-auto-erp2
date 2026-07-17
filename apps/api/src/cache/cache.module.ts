import { Global, Module, forwardRef } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { CacheService } from './cache.service';
import { DomainCacheService } from './domain-cache.service';

@Global()
@Module({
  imports: [forwardRef(() => DashboardModule)],
  providers: [CacheService, DomainCacheService],
  exports: [CacheService, DomainCacheService],
})
export class CacheModule {}
