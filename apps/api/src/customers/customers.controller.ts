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
import { CreateCustomerContactDto } from './dto/create-customer-contact.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerContactDto } from './dto/update-customer-contact.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CustomersService } from './customers.service';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @RequirePermissions('customers.manage')
  create(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('customers.manage', 'dashboard.view')
  list(
    @CurrentUser() user: { organizationId: string },
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.list(user.organizationId, search, { page, limit });
  }

  @Get(':id')
  @RequirePermissions('customers.manage', 'dashboard.view')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.customersService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('customers.manage')
  update(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(user.organizationId, id, dto, user.userId);
  }

  @Post(':id/contacts')
  @RequirePermissions('customers.manage')
  addContact(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateCustomerContactDto,
  ) {
    return this.customersService.addContact(user.organizationId, id, dto);
  }

  @Patch(':id/contacts/:contactId')
  @RequirePermissions('customers.manage')
  updateContact(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateCustomerContactDto,
  ) {
    return this.customersService.updateContact(
      user.organizationId,
      id,
      contactId,
      dto,
    );
  }

  @Delete(':id/contacts/:contactId')
  @RequirePermissions('customers.manage')
  removeContact(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    return this.customersService.removeContact(user.organizationId, id, contactId);
  }

  @Delete(':id')
  @RequirePermissions('customers.manage')
  remove(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
  ) {
    return this.customersService.remove(user.organizationId, id, user.userId);
  }
}
