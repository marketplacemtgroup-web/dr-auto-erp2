import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QuotesModule } from '../quotes/quotes.module';
import { EventsModule } from '../events/events.module';
import { PushModule } from '../push/push.module';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { PortalJwtStrategy } from './portal.strategy';

@Module({
  imports: [AuthModule, QuotesModule, EventsModule, PushModule],
  controllers: [PortalController],
  providers: [PortalService, PortalJwtStrategy],
  exports: [PortalService],
})
export class PortalModule {}

