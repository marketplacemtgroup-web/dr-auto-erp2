import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { EquityService } from './equity.service';
import {
  CreateContributionDto,
  CreateTransferDto,
  CreateWithdrawalDto,
} from './dto/equity.dto';

@Controller('financial')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EquityController {
  constructor(private readonly equity: EquityService) {}

  @Get('transfers')
  @RequirePermissions('financial.manage')
  listTransfers(
    @CurrentUser() user: { organizationId: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.equity.listTransfers(user.organizationId, { page, limit });
  }

  @Post('transfers')
  @RequirePermissions('financial.manage')
  createTransfer(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Body() dto: CreateTransferDto,
  ) {
    return this.equity.createTransfer(user.organizationId, dto, user.userId);
  }

  @Post('transfers/:id/reverse')
  @RequirePermissions('financial.manage')
  reverseTransfer(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
  ) {
    return this.equity.reverseTransfer(user.organizationId, id, user.userId);
  }

  @Get('contributions')
  @RequirePermissions('financial.manage')
  listContributions(@CurrentUser() user: { organizationId: string }) {
    return this.equity.listContributions(user.organizationId);
  }

  @Post('contributions')
  @RequirePermissions('financial.manage')
  createContribution(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Body() dto: CreateContributionDto,
  ) {
    return this.equity.createContribution(user.organizationId, dto, user.userId);
  }

  @Get('withdrawals')
  @RequirePermissions('financial.manage')
  listWithdrawals(@CurrentUser() user: { organizationId: string }) {
    return this.equity.listWithdrawals(user.organizationId);
  }

  @Post('withdrawals')
  @RequirePermissions('financial.manage')
  createWithdrawal(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Body() dto: CreateWithdrawalDto,
  ) {
    return this.equity.createWithdrawal(user.organizationId, dto, user.userId);
  }
}
