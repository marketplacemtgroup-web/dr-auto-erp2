import { Controller, Get, Header, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
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
  async renderServiceOrder(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const html = await this.printHtml.renderServiceOrder(user.organizationId, id);
    res.type('text/html; charset=utf-8').send(html);
  }

  @Get('quotes/:id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @RequirePermissions('quotes.manage', 'dashboard.view')
  async renderQuote(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const html = await this.printHtml.renderQuote(user.organizationId, id);
    res.type('text/html; charset=utf-8').send(html);
  }
}
