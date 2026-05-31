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
import { CreateServiceCatalogDto } from './dto/create-service-catalog.dto';
import { UpdateServiceCatalogDto } from './dto/update-service-catalog.dto';
import { ServiceCatalogService } from './service-catalog.service';

@Controller('service-catalog')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ServiceCatalogController {
  constructor(private readonly serviceCatalogService: ServiceCatalogService) {}

  @Post()
  @RequirePermissions('service_orders.manage', 'inventory.manage')
  create(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateServiceCatalogDto,
  ) {
    return this.serviceCatalogService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('service_orders.manage', 'dashboard.view', 'inventory.manage')
  list(
    @CurrentUser() user: { organizationId: string },
    @Query('search') search?: string,
    @Query('all') all?: string,
  ) {
    return this.serviceCatalogService.list(
      user.organizationId,
      search,
      all !== 'true',
    );
  }

  @Get(':id')
  @RequirePermissions('service_orders.manage', 'dashboard.view')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.serviceCatalogService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('service_orders.manage', 'inventory.manage')
  update(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateServiceCatalogDto,
  ) {
    return this.serviceCatalogService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('service_orders.manage', 'inventory.manage')
  remove(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.serviceCatalogService.remove(user.organizationId, id);
  }
}
