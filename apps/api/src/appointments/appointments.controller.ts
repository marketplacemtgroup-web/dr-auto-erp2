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
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @RequirePermissions('service_orders.manage')
  create(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('service_orders.manage', 'dashboard.view')
  list(
    @CurrentUser() user: { organizationId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    return this.appointmentsService.list(user.organizationId, from, to, status);
  }

  @Get(':id')
  @RequirePermissions('service_orders.manage', 'dashboard.view')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.appointmentsService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('service_orders.manage')
  update(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(user.organizationId, id, dto);
  }

  @Post(':id/convert-to-os')
  @RequirePermissions('service_orders.manage')
  convertToOs(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.appointmentsService.convertToServiceOrder(user.organizationId, id);
  }

  @Delete(':id')
  @RequirePermissions('service_orders.manage')
  remove(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.appointmentsService.remove(user.organizationId, id);
  }
}
