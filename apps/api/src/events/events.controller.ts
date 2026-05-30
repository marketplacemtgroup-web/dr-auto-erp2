import { Controller, Query, Sse, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly jwt: JwtService,
  ) {}

  @Sse('stream')
  stream(@Query('token') token: string): Observable<MessageEvent> {
    if (!token) throw new UnauthorizedException();
    let payload: { organizationId?: string; portal?: boolean };
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException();
    }
    if (payload.portal || !payload.organizationId) {
      throw new UnauthorizedException();
    }
    return this.eventsService.subscribe(payload.organizationId);
  }
}
