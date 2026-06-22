import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MaintenanceReminderStatus } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { MaintenanceRemindersService } from './maintenance-reminders.service';

@Controller('maintenance-reminders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaintenanceRemindersController {
  constructor(private readonly service: MaintenanceRemindersService) {}

  @Get()
  @RequirePermissions('dashboard.view', 'service_orders.manage')
  list(
    @CurrentUser() user: { organizationId: string },
    @Query('filter') filter?: 'overdue' | 'upcoming' | 'all',
  ) {
    return this.service.list(user.organizationId, filter ?? 'all');
  }

  @Get('month-overdue')
  @RequirePermissions('dashboard.view', 'service_orders.manage')
  monthOverdue(@CurrentUser() user: { organizationId: string }) {
    return this.service.getMonthOverdueList(user.organizationId);
  }

  @Patch(':id')
  @RequirePermissions('service_orders.manage')
  updateStatus(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() body: { status: MaintenanceReminderStatus },
  ) {
    if (!['COMPLETED', 'DISMISSED', 'ACTIVE'].includes(body.status)) {
      throw new BadRequestException('Status inválido');
    }
    return this.service.updateStatus(user.organizationId, id, body.status);
  }
}
