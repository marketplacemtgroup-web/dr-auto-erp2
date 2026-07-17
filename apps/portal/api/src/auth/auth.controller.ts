import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrganizationsService } from '../organizations/organizations.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get('setup-status')
  setupStatus() {
    return this.authService.getSetupStatus();
  }

  @Get('branding')
  branding() {
    return this.organizationsService.getPublicBranding();
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register-organization')
  @UseInterceptors(FileInterceptor('logo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  register(
    @Body() dto: RegisterOrganizationDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.authService.registerOrganization(dto, logo);
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
