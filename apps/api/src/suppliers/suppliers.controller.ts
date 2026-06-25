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
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @RequirePermissions('suppliers.manage', 'purchases.manage', 'inventory.manage', 'dashboard.view')
  list(
    @CurrentUser() user: { organizationId: string },
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.suppliersService.list(user.organizationId, search, status, { page, limit });
  }

  @Get(':id/profile')
  @RequirePermissions('suppliers.manage', 'purchases.manage', 'inventory.manage')
  profile(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.suppliersService.profile(user.organizationId, id);
  }

  @Get(':id')
  @RequirePermissions('suppliers.manage', 'purchases.manage', 'inventory.manage')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.suppliersService.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions('suppliers.manage', 'inventory.manage')
  create(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions('suppliers.manage', 'inventory.manage')
  update(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('suppliers.manage', 'inventory.manage')
  remove(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.suppliersService.remove(user.organizationId, id);
  }
}
