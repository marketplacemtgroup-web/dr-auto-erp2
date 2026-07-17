import {
  Body,
  Controller,
  Delete,
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
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { CreateServiceOrderItemDto } from './dto/create-service-order-item.dto';
import { UpdateServiceOrderItemDto } from './dto/update-service-order-item.dto';
import { UpdateInternalCostDto } from './dto/update-internal-cost.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { PreviewItemCommissionDto } from './dto/preview-item-commission.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { PortalService } from '../portal/portal.service';
import { ServiceOrdersService } from './service-orders.service';

@Controller('service-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ServiceOrdersController {
  constructor(
    private readonly serviceOrdersService: ServiceOrdersService,
    private readonly portalService: PortalService,
  ) {}

  @Post()
  @RequirePermissions('service_orders.manage')
  create(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateServiceOrderDto,
  ) {
    return this.serviceOrdersService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('service_orders.manage', 'dashboard.view')
  list(
    @CurrentUser() user: { organizationId: string },
    @Query('search') search?: string,
    @Query('scheduled') scheduled?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.serviceOrdersService.list(
      user.organizationId,
      search,
      scheduled === 'true',
      status,
      { page, limit },
    );
  }

  @Post(':id/portal-link')
  @RequirePermissions('service_orders.manage')
  portalLink(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.portalService.createPortalAccessLink(user.organizationId, id);
  }

  @Get(':id')
  @RequirePermissions('service_orders.manage', 'dashboard.view')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.serviceOrdersService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('service_orders.manage')
  update(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateServiceOrderDto,
  ) {
    return this.serviceOrdersService.update(user.organizationId, id, dto, user.userId);
  }

  @Patch(':id/checklist')
  @RequirePermissions('service_orders.manage')
  updateChecklist(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateChecklistDto,
  ) {
    return this.serviceOrdersService.updateChecklist(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('service_orders.manage')
  remove(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
  ) {
    return this.serviceOrdersService.remove(user.organizationId, id, user.userId);
  }

  @Post(':id/preview-item-commission')
  @RequirePermissions('service_orders.manage')
  previewItemCommission(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: PreviewItemCommissionDto,
  ) {
    return this.serviceOrdersService.previewItemCommissionForOrder(
      user.organizationId,
      id,
      {
        itemType: dto.itemType,
        quantity: dto.quantity ?? 1,
        unitPrice: dto.unitPrice,
        discount: dto.discount ?? 0,
        catalogItemId: dto.catalogItemId ?? null,
        productId: dto.productId ?? null,
        executorId: dto.executorId ?? null,
        coExecutorId: dto.coExecutorId ?? null,
        coExecutorSplitPct: dto.coExecutorSplitPct ?? null,
        soldById: dto.soldById ?? null,
      },
    );
  }

  @Post(':id/items')
  @RequirePermissions('service_orders.manage')
  addItem(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body() dto: CreateServiceOrderItemDto,
  ) {
    return this.serviceOrdersService.addItem(
      user.organizationId,
      id,
      dto,
      user.userId,
    );
  }

  @Patch(':id/items/:itemId')
  @RequirePermissions('service_orders.manage')
  updateItem(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateServiceOrderItemDto,
  ) {
    return this.serviceOrdersService.updateItem(
      user.organizationId,
      id,
      itemId,
      dto,
      user.userId,
    );
  }

  @Patch(':id/items/:itemId/internal-cost')
  @RequirePermissions('service_orders.manage')
  updateInternalCost(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateInternalCostDto,
  ) {
    return this.serviceOrdersService.updateInternalCost(
      user.organizationId,
      id,
      itemId,
      dto,
      user.userId,
    );
  }

  @Delete(':id/items/:itemId')
  @RequirePermissions('service_orders.manage')
  removeItem(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.serviceOrdersService.removeItem(
      user.organizationId,
      id,
      itemId,
      user.userId,
    );
  }
}
