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
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @RequirePermissions('vehicles.manage')
  create(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('vehicles.manage', 'dashboard.view', 'service_orders.manage')
  list(
    @CurrentUser() user: { organizationId: string },
    @Query('search') search?: string,
  ) {
    return this.vehiclesService.list(user.organizationId, search);
  }

  @Get(':id')
  @RequirePermissions('vehicles.manage', 'dashboard.view')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.vehiclesService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('vehicles.manage')
  update(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('vehicles.manage')
  remove(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.vehiclesService.remove(user.organizationId, id);
  }
}
