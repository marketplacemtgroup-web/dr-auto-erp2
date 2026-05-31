import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApproveLinesDto } from '../quotes/dto/approve-lines.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { PortalLoginDto } from './dto/portal-login.dto';
import { PortalJwtGuard } from './portal.guard';
import { PortalService } from './portal.service';

@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Post('login')
  login(@Body() dto: PortalLoginDto) {
    return this.portalService.login(dto.cpf, dto.plate);
  }

  @Get('access/:token')
  accessByToken(@Param('token') token: string) {
    return this.portalService.loginByAccessToken(token);
  }

  @Get('dashboard')
  @UseGuards(PortalJwtGuard)
  dashboard(@CurrentUser() user: { organizationId: string; vehicleId: string }) {
    return this.portalService.getDashboard(user);
  }

  @Get('service-orders/:id')
  @UseGuards(PortalJwtGuard)
  serviceOrder(
    @CurrentUser() user: { organizationId: string; vehicleId: string },
    @Param('id') id: string,
  ) {
    return this.portalService.getServiceOrderForPortal(user, id);
  }

  @Get('push/vapid-public-key')
  vapidKey() {
    return this.portalService.getVapidPublicKey();
  }

  @Post('push/subscribe')
  @UseGuards(PortalJwtGuard)
  pushSubscribe(
    @CurrentUser() user: { organizationId: string; vehicleId: string },
    @Body()
    body: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string },
  ) {
    return this.portalService.savePushSubscription(user, body);
  }

  @Get('me')
  @UseGuards(PortalJwtGuard)
  me(@CurrentUser() user: { organizationId: string; vehicleId: string }) {
    return this.portalService.me(user);
  }

  @Get('quotes')
  @UseGuards(PortalJwtGuard)
  listQuotes(@CurrentUser() user: { organizationId: string; vehicleId: string }) {
    return this.portalService.listQuotes(user);
  }

  @Patch('quotes/:id/approve')
  @UseGuards(PortalJwtGuard)
  approve(
    @CurrentUser() user: { organizationId: string; vehicleId: string },
    @Param('id') id: string,
    @Body() dto?: ApproveLinesDto,
  ) {
    return this.portalService.approveQuote(user, id, dto);
  }

  @Patch('quotes/:id/reject')
  @UseGuards(PortalJwtGuard)
  reject(
    @CurrentUser() user: { organizationId: string; vehicleId: string },
    @Param('id') id: string,
    @Body() body?: { comment?: string },
  ) {
    return this.portalService.rejectQuote(user, id, body?.comment);
  }

  @Get('public/quote/:token')
  getPublicQuote(@Param('token') token: string) {
    return this.portalService.getPublicQuote(token);
  }

  @Patch('public/quote/:token/approve')
  approvePublic(@Param('token') token: string, @Body() dto?: ApproveLinesDto) {
    return this.portalService.approvePublicQuote(token, dto);
  }

  @Patch('public/quote/:token/reject')
  rejectPublic(@Param('token') token: string, @Body() body?: { comment?: string }) {
    return this.portalService.rejectPublicQuote(token, body?.comment);
  }
}
