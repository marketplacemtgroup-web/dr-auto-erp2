import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ConfirmPurchaseDto } from './dto/confirm-purchase.dto';
import { ReceivePurchaseDto } from './dto/receive-purchase.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  @RequirePermissions('purchases.manage', 'inventory.manage', 'dashboard.view')
  list(
    @CurrentUser() user: { organizationId: string },
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchasesService.list(user.organizationId, search, status, { page, limit });
  }

  @Get(':id')
  @RequirePermissions('purchases.manage', 'inventory.manage', 'dashboard.view')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.purchasesService.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions('purchases.manage', 'inventory.manage')
  create(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchasesService.create(user.organizationId, dto, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('purchases.manage', 'inventory.manage')
  update(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.purchasesService.update(user.organizationId, id, dto);
  }

  @Patch(':id/confirm')
  @RequirePermissions('purchases.manage', 'inventory.manage')
  confirm(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body() dto: ConfirmPurchaseDto,
  ) {
    return this.purchasesService.confirm(user.organizationId, id, user.userId, {
      postToStock: dto.postToStock,
      autoCreateProducts: dto.autoCreateProducts,
    });
  }

  @Patch(':id/receive')
  @RequirePermissions('purchases.manage', 'inventory.manage')
  receive(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseDto,
  ) {
    return this.purchasesService.receive(user.organizationId, id, dto, user.userId);
  }

  @Patch(':id/cancel')
  @RequirePermissions('purchases.manage', 'inventory.manage')
  cancel(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
  ) {
    return this.purchasesService.cancel(user.organizationId, id, user.userId);
  }
}
