import { Global, Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { EventsService } from './events.service';
import { PortalCustomerNotifyService } from './portal-customer-notify.service';

@Global()
@Module({
  imports: [PushModule],
  providers: [EventsService, PortalCustomerNotifyService],
  exports: [EventsService, PortalCustomerNotifyService],
})
export class EventsModule {}
