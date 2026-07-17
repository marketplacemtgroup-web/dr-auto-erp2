import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ReconciliationStatus } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CashFlowService } from './cashflow.service';
import { ReconciliationService } from './reconciliation.service';

class CashFlowQuery {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  groupBy?: 'day' | 'week' | 'month' | 'year';

  @IsOptional()
  @IsString()
  accountId?: string;
}

class ReconcileMovementDto {
  @IsEnum(ReconciliationStatus)
  status!: ReconciliationStatus;
}

class CreateReconciliationDto {
  @IsString()
  accountId!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsNumber()
  bankBalance!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

@Controller('financial')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashFlowController {
  constructor(
    private readonly cashFlow: CashFlowService,
    private readonly reconciliation: ReconciliationService,
  ) {}

  @Get('cash-flow-report')
  @RequirePermissions('financial.manage', 'dashboard.view_financial')
  report(
    @CurrentUser() user: { organizationId: string },
    @Query() query: CashFlowQuery,
  ) {
    return this.cashFlow.report(
      user.organizationId,
      query.from,
      query.to,
      query.groupBy ?? 'day',
      query.accountId,
    );
  }

  @Get('reconciliations')
  @RequirePermissions('financial.manage')
  listReconciliations(@CurrentUser() user: { organizationId: string }) {
    return this.reconciliation.list(user.organizationId);
  }

  @Post('reconciliations')
  @RequirePermissions('financial.manage')
  createReconciliation(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Body() dto: CreateReconciliationDto,
  ) {
    return this.reconciliation.create(user.organizationId, dto, user.userId);
  }

  @Patch('movements/:movementId/reconcile')
  @RequirePermissions('financial.manage')
  reconcileMovement(
    @CurrentUser() user: { organizationId: string },
    @Param('movementId') movementId: string,
    @Body() dto: ReconcileMovementDto,
  ) {
    return this.reconciliation.updateMovementStatus(
      user.organizationId,
      movementId,
      dto.status,
    );
  }
}
