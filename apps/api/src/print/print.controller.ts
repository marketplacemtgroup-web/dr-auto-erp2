import { Controller, Get, Header, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { PrintHtmlService } from './print-html.service';

@Controller('print')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PrintController {
  constructor(private readonly printHtml: PrintHtmlService) {}

  @Get('service-orders/:id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @RequirePermissions('service_orders.manage', 'dashboard.view')
  renderServiceOrder(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.printHtml.renderServiceOrder(user.organizationId, id);
  }

  @Get('quotes/:id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @RequirePermissions('quotes.manage', 'dashboard.view')
  renderQuote(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.printHtml.renderQuote(user.organizationId, id);
  }
}
