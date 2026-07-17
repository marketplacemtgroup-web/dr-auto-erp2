import { Module, forwardRef } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { QuotesSyncService } from './quotes-sync.service';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';

@Module({
  imports: [forwardRef(() => ServiceOrdersModule)],
  controllers: [QuotesController],
  providers: [QuotesService, QuotesSyncService],
  exports: [QuotesSyncService, QuotesService],
})
export class QuotesModule {}
