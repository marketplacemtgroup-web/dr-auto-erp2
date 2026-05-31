import { Global, Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { EventsService } from './events.service';

@Global()
@Module({
  imports: [PushModule],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
