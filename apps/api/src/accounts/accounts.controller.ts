import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { AccountsService } from './accounts.service';
import {
  CreateCostCenterDto,
  CreateFinancialAccountDto,
  UpdateFinancialAccountDto,
} from './dto/account.dto';
import { LedgerService } from '../ledger/ledger.service';

@Controller('financial/accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountsController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly ledger: LedgerService,
  ) {}

  @Get()
  @RequirePermissions('financial.manage', 'financial.view')
  list(@CurrentUser() user: { organizationId: string }) {
    return this.accounts.listAccounts(user.organizationId);
  }

  @Get('summary')
  @RequirePermissions('financial.manage', 'financial.view', 'dashboard.view_financial')
  summary(@CurrentUser() user: { organizationId: string }) {
    return this.accounts.getBalancesSummary(user.organizationId);
  }

  @Get('cost-centers')
  @RequirePermissions('financial.manage')
  listCostCenters(@CurrentUser() user: { organizationId: string }) {
    return this.accounts.listCostCenters(user.organizationId);
  }

  @Post('cost-centers')
  @RequirePermissions('financial.manage')
  createCostCenter(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateCostCenterDto,
  ) {
    return this.accounts.createCostCenter(user.organizationId, dto);
  }

  @Get(':id')
  @RequirePermissions('financial.manage', 'financial.view')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.accounts.findAccount(user.organizationId, id);
  }

  @Get(':id/statement')
  @RequirePermissions('financial.manage', 'financial.view')
  statement(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.accounts.getStatement(user.organizationId, id, from, to, {
      page,
      limit,
    });
  }

  @Post(':id/recompute')
  @RequirePermissions('financial.manage')
  recompute(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.ledger.recomputeBalance(user.organizationId, id);
  }

  @Post()
  @RequirePermissions('financial.manage')
  create(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Body() dto: CreateFinancialAccountDto,
  ) {
    return this.accounts.createAccount(user.organizationId, dto, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('financial.manage')
  update(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateFinancialAccountDto,
  ) {
    return this.accounts.updateAccount(user.organizationId, id, dto, user.userId);
  }
}
