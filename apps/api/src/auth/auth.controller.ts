import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('setup-status')
  setupStatus() {
    return this.authService.getSetupStatus();
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register-organization')
  register(@Body() dto: RegisterOrganizationDto) {
    return this.authService.registerOrganization(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(
    @CurrentUser()
    user: {
      userId: string;
      organizationId: string;
      memberId: string;
    },
  ) {
    return this.authService.me(
      user.userId,
      user.organizationId,
      user.memberId,
    );
  }
}
