import { Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('unread')
  @RequirePermissions('dashboard.view')
  unread(@CurrentUser() user: { organizationId: string }) {
    return this.notificationsService.listUnread(user.organizationId);
  }

  @Patch(':id/read')
  @RequirePermissions('dashboard.view')
  read(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.notificationsService.markRead(user.organizationId, id);
  }

  @Post('read-all')
  @RequirePermissions('dashboard.view')
  readAll(@CurrentUser() user: { organizationId: string }) {
    return this.notificationsService.markAllRead(user.organizationId);
  }
}
