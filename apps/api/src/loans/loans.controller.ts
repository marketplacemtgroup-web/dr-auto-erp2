import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/loan.dto';
import { IsString } from 'class-validator';

class PayLoanInstallmentDto {
  @IsString()
  accountId!: string;
}

@Controller('financial/loans')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  @Get()
  @RequirePermissions('financial.manage')
  list(@CurrentUser() user: { organizationId: string }) {
    return this.loans.list(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('financial.manage')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.loans.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions('financial.manage')
  create(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Body() dto: CreateLoanDto,
  ) {
    return this.loans.create(user.organizationId, dto, user.userId);
  }

  @Post('installments/:installmentId/pay')
  @RequirePermissions('financial.manage')
  payInstallment(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('installmentId') installmentId: string,
    @Body() dto: PayLoanInstallmentDto,
  ) {
    return this.loans.markInstallmentPaid(
      user.organizationId,
      installmentId,
      dto.accountId,
      user.userId,
    );
  }
}
