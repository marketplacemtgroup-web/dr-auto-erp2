import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import {
  CreateFinancialEntryDto,
  CreateInstallmentsDto,
  PayFinancialEntryDto,
  UpdateFinancialEntryDto,
} from './dto/create-financial-entry.dto';
import { DeleteFinancialEntryDto } from './dto/delete-financial-entry.dto';
import { ReverseFinancialEntryDto } from './dto/reverse-financial-entry.dto';
import {
  CreateFixedExpenseDto,
  UpdateFixedExpenseDto,
} from './dto/fixed-expense.dto';
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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financialService.list(
      user.organizationId,
      search,
      type,
      status,
      origin,
      supplierId,
      { page, limit },
    );
  }

  @Get('summary')
  @RequirePermissions('financial.manage', 'dashboard.view')
  summary(
    @CurrentUser() user: { organizationId: string },
    @Query('month') month?: string,
  ) {
    return this.financialService.getSummary(user.organizationId, month);
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

  @Get('fixed-expenses')
  @RequirePermissions('financial.manage', 'dashboard.view')
  listFixedExpenses(@CurrentUser() user: { organizationId: string }) {
    return this.financialService.listFixedExpenses(user.organizationId);
  }

  @Post('fixed-expenses')
  @RequirePermissions('financial.manage')
  createFixedExpense(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateFixedExpenseDto,
  ) {
    return this.financialService.createFixedExpense(user.organizationId, dto);
  }

  @Patch('fixed-expenses/:id')
  @RequirePermissions('financial.manage')
  updateFixedExpense(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateFixedExpenseDto,
  ) {
    return this.financialService.updateFixedExpense(user.organizationId, id, dto);
  }

  @Delete('fixed-expenses/:id')
  @RequirePermissions('financial.manage')
  deleteFixedExpense(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.financialService.deleteFixedExpense(user.organizationId, id);
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

  @Patch(':id')
  @RequirePermissions('financial.manage')
  update(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateFinancialEntryDto,
  ) {
    return this.financialService.update(user.organizationId, id, dto, user.userId);
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

  @Patch(':id/reverse')
  @RequirePermissions('financial.manage')
  reverse(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body() dto: ReverseFinancialEntryDto,
  ) {
    return this.financialService.reverse(
      user.organizationId,
      id,
      dto.reason,
      user.userId,
    );
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
