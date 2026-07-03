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
import { CreateOutsourcedServiceDto } from './dto/create-outsourced-service.dto';
import { UpdateOutsourcedServiceDto } from './dto/update-outsourced-service.dto';
import { OutsourcedServicesService } from './outsourced-services.service';

@Controller('outsourced-services')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OutsourcedServicesController {
  constructor(private readonly outsourcedServicesService: OutsourcedServicesService) {}

  @Post()
  @RequirePermissions('inventory.manage', 'service_orders.manage')
  create(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateOutsourcedServiceDto,
  ) {
    return this.outsourcedServicesService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('inventory.manage', 'service_orders.manage', 'dashboard.view')
  list(
    @CurrentUser() user: { organizationId: string },
    @Query('search') search?: string,
    @Query('all') all?: string,
  ) {
    return this.outsourcedServicesService.list(
      user.organizationId,
      search,
      all !== 'true',
    );
  }

  @Get(':id')
  @RequirePermissions('inventory.manage', 'service_orders.manage', 'dashboard.view')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.outsourcedServicesService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('inventory.manage', 'service_orders.manage')
  update(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateOutsourcedServiceDto,
  ) {
    return this.outsourcedServicesService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('inventory.manage', 'service_orders.manage')
  remove(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.outsourcedServicesService.remove(user.organizationId, id);
  }
}
