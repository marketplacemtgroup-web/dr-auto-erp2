import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Redirect,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { AttachmentsService } from './attachments.service';

@Controller('attachments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get('service-order/:serviceOrderId')
  @RequirePermissions('service_orders.manage', 'dashboard.view')
  list(
    @CurrentUser() user: { organizationId: string },
    @Param('serviceOrderId') serviceOrderId: string,
  ) {
    return this.attachmentsService.listForServiceOrder(
      user.organizationId,
      serviceOrderId,
    );
  }

  @Get(':id/file')
  @RequirePermissions('service_orders.manage', 'dashboard.view', 'vehicles.manage')
  @Redirect('', 302)
  async file(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    const { url } = await this.attachmentsService.resolveDownloadUrl(user.organizationId, id);
    return { url };
  }

  @Post('service-order/:serviceOrderId')
  @RequirePermissions('service_orders.manage')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('serviceOrderId') serviceOrderId: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string },
    @Query('category') category?: string,
    @Query('visibleToCustomer') visibleToCustomer?: string,
    @Query('showOnQuote') showOnQuote?: string,
  ) {
    return this.attachmentsService.uploadForServiceOrder(
      user.organizationId,
      serviceOrderId,
      file,
      {
        category,
        visibleToCustomer: visibleToCustomer === 'true',
        showOnQuote: showOnQuote === 'true',
        userId: user.userId,
      },
    );
  }

  @Post('vehicle/:vehicleId')
  @RequirePermissions('vehicles.manage', 'service_orders.manage')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadVehicle(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('vehicleId') vehicleId: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string },
    @Query('category') category?: string,
  ) {
    return this.attachmentsService.uploadForVehicle(
      user.organizationId,
      vehicleId,
      file,
      { category, userId: user.userId },
    );
  }

  @Delete(':id')
  @RequirePermissions('service_orders.manage')
  remove(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.attachmentsService.remove(user.organizationId, id);
  }
}
