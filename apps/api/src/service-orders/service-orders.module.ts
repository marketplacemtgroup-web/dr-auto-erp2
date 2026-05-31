import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { ProductsModule } from '../products/products.module';
import { QuotesModule } from '../quotes/quotes.module';
import { PortalModule } from '../portal/portal.module';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';

@Module({
  imports: [AttachmentsModule, QuotesModule, ProductsModule, PortalModule],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService],
})
export class ServiceOrdersModule {}
