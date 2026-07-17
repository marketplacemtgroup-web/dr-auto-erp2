import { Module, forwardRef } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { QuotesModule } from '../quotes/quotes.module';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';
import { PrintController } from './print.controller';
import { PrintHtmlService } from './print-html.service';

@Module({
  imports: [
    OrganizationsModule,
    forwardRef(() => ServiceOrdersModule),
    forwardRef(() => QuotesModule),
  ],
  controllers: [PrintController],
  providers: [PrintHtmlService],
  exports: [PrintHtmlService],
})
export class PrintModule {}
