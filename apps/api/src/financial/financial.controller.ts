import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import {
  CreateFinancialEntryDto,
  CreateInstallmentsDto,
  PayFinancialEntryDto,
} from './dto/create-financial-entry.dto';
import { DeleteFinancialEntryDto } from './dto/delete-financial-entry.dto';
import { FinancialService } from './financial.service';

@Controller('financial')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  @Get()
  @RequirePermissions('financial.manage', 'dashboard.view')
  list(
    @CurrentUser() user: { organizationId: string },
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('origin') origin?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.financialService.list(
      user.organizationId,
      search,
      type,
      status,
      origin,
      supplierId,
    );
  }

  @Get('cash-flow')
  @RequirePermissions('financial.manage', 'dashboard.view')
  cashFlow(@CurrentUser() user: { organizationId: string }) {
    return this.financialService.cashFlow(user.organizationId);
  }

  @Get('profit-summary')
  @RequirePermissions('financial.manage', 'financial.view', 'dashboard.view_financial')
  profitSummary(
    @CurrentUser() user: { organizationId: string },
    @Query('period') period?: 'day' | 'week' | 'month' | 'year',
  ) {
    const preset =
      period === 'day' || period === 'week' || period === 'month' || period === 'year'
        ? period
        : 'month';
    return this.financialService.profitSummary(user.organizationId, preset);
  }

  @Get('receive-queue')
  @RequirePermissions('financial.manage')
  receiveQueue(@CurrentUser() user: { organizationId: string }) {
    return this.financialService.receiveQueue(user.organizationId);
  }

  @Post()
  @RequirePermissions('financial.manage')
  create(@CurrentUser() user: { organizationId: string }, @Body() dto: CreateFinancialEntryDto) {
    return this.financialService.create(user.organizationId, dto);
  }

  @Post('installments')
  @RequirePermissions('financial.manage')
  installments(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateInstallmentsDto,
  ) {
    return this.financialService.createInstallments(user.organizationId, dto);
  }

  @Post('from-service-order/:serviceOrderId')
  @RequirePermissions('financial.manage')
  fromServiceOrder(
    @CurrentUser() user: { organizationId: string },
    @Param('serviceOrderId') serviceOrderId: string,
  ) {
    return this.financialService.createFromServiceOrder(user.organizationId, serviceOrderId);
  }

  @Patch(':id/pay')
  @RequirePermissions('financial.manage')
  pay(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body() dto: PayFinancialEntryDto,
  ) {
    return this.financialService.markPaid(user.organizationId, id, dto, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('financial.manage')
  remove(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body() dto: DeleteFinancialEntryDto,
  ) {
    return this.financialService.remove(user.organizationId, id, dto.reason, user.userId);
  }
}
