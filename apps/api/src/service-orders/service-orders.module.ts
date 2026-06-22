import { Module, forwardRef } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { FinancialModule } from '../financial/financial.module';
import { MaintenanceRemindersModule } from '../maintenance-reminders/maintenance-reminders.module';
import { ProductsModule } from '../products/products.module';
import { QuotesModule } from '../quotes/quotes.module';
import { PortalModule } from '../portal/portal.module';
import { TeamModule } from '../team/team.module';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';

@Module({
  imports: [
    AttachmentsModule,
    AppointmentsModule,
    MaintenanceRemindersModule,
    forwardRef(() => QuotesModule),
    ProductsModule,
    forwardRef(() => PortalModule),
    FinancialModule,
    forwardRef(() => TeamModule),
  ],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}
