import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('members')
  @RequirePermissions('users.manage', 'service_orders.manage')
  list(@CurrentUser() user: { organizationId: string }) {
    return this.usersService.listMembers(user.organizationId);
  }
}
