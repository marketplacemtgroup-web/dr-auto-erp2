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
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermissions('inventory.manage')
  create(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('inventory.manage', 'dashboard.view', 'service_orders.manage')
  list(
    @CurrentUser() user: { organizationId: string },
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.list(
      user.organizationId,
      search,
      lowStock === 'true',
      { page, limit },
    );
  }

  @Get('pending-review')
  @RequirePermissions('inventory.manage', 'dashboard.view')
  listPendingReview(
    @CurrentUser() user: { organizationId: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.listPendingReview(user.organizationId, { page, limit });
  }

  @Get('movements')
  @RequirePermissions('inventory.manage', 'dashboard.view')
  listMovements(
    @CurrentUser() user: { organizationId: string },
    @Query('productId') productId?: string,
  ) {
    return this.productsService.listMovements(user.organizationId, productId);
  }

  @Get(':id')
  @RequirePermissions('inventory.manage', 'dashboard.view')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.productsService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('inventory.manage')
  update(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(user.organizationId, id, dto);
  }

  @Patch(':id/stock')
  @RequirePermissions('inventory.manage')
  adjustStock(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.productsService.adjustStock(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('inventory.manage')
  remove(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.productsService.remove(user.organizationId, id);
  }
}
