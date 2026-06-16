import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CashService } from './cash.service';
import { CashMovementDto, CloseCashDto, OpenCashDto } from './dto/open-cash.dto';

@Controller('cash')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get('current')
  @RequirePermissions('financial.manage', 'dashboard.view')
  async current(@CurrentUser() user: { organizationId: string }) {
    const session = await this.cashService.getCurrentSession(user.organizationId);
    return session ?? null;
  }

  @Post('open')
  @RequirePermissions('financial.manage')
  open(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Body() dto: OpenCashDto,
  ) {
    return this.cashService.openSession(user.organizationId, user.userId, dto.openingBalance);
  }

  @Post(':sessionId/close')
  @RequirePermissions('financial.manage')
  close(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('sessionId') sessionId: string,
    @Body() dto: CloseCashDto,
  ) {
    return this.cashService.closeSession(
      user.organizationId,
      user.userId,
      sessionId,
      dto.closingBalance,
      dto.notes,
    );
  }

  @Post(':sessionId/movement')
  @RequirePermissions('financial.manage')
  movement(
    @CurrentUser() user: { organizationId: string },
    @Param('sessionId') sessionId: string,
    @Body() dto: CashMovementDto,
  ) {
    return this.cashService.addMovement(user.organizationId, sessionId, dto);
  }
}
