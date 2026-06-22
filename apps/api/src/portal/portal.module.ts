import { Module, forwardRef } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AuthModule } from '../auth/auth.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { QuotesModule } from '../quotes/quotes.module';
import { EventsModule } from '../events/events.module';
import { PushModule } from '../push/push.module';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { PortalJwtStrategy } from './portal.strategy';

@Module({
  imports: [
    AuthModule,
    AppointmentsModule,
    AttachmentsModule,
    forwardRef(() => QuotesModule),
    EventsModule,
    PushModule,
  ],
  controllers: [PortalController],
  providers: [PortalService, PortalJwtStrategy],
  exports: [PortalService],
})
export class PortalModule {}

