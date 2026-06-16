import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  @RequirePermissions('dashboard.view')
  list(
    @CurrentUser() user: { organizationId: string },
    @Query('search') search?: string,
  ) {
    return this.purchasesService.list(user.organizationId, search);
  }

  @Post()
  @RequirePermissions('dashboard.view')
  create(@CurrentUser() user: { organizationId: string }, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchasesService.create(user.organizationId, dto);
  }

  @Patch(':id/receive')
  @RequirePermissions('dashboard.view')
  receive(@CurrentUser() user: { organizationId: string }, @Param('id') id: string) {
    return this.purchasesService.markReceived(user.organizationId, id);
  }
}

