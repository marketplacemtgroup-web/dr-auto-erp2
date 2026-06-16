import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { QuotesSyncService } from './quotes-sync.service';

@Module({
  controllers: [QuotesController],
  providers: [QuotesService, QuotesSyncService],
  exports: [QuotesSyncService, QuotesService],
})
export class QuotesModule {}
