import {
  BadRequestException,
  Body,
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
import {
  ConfirmAttachmentUploadDto,
  PrepareAttachmentUploadDto,
} from './dto/prepare-attachment-upload.dto';
import { AttachmentsService } from './attachments.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import type { ListQueryInput } from '../common/pagination';

@Controller('attachments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttachmentsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly storage: SupabaseStorageService,
  ) {}

  @Get('storage-info')
  @RequirePermissions('service_orders.manage', 'dashboard.view', 'vehicles.manage')
  storageInfo() {
    return {
      cloud: this.storage.isCloudStorage(),
      directUpload: this.storage.isCloudStorage(),
      maxUploadMb: this.storage.isCloudStorage() ? 50 : 10,
    };
  }

  @Get('service-order/:serviceOrderId')
  @RequirePermissions('service_orders.manage', 'dashboard.view')
  list(
    @CurrentUser() user: { organizationId: string },
    @Param('serviceOrderId') serviceOrderId: string,
    @Query() query: ListQueryInput,
  ) {
    return this.attachmentsService.listForServiceOrder(
      user.organizationId,
      serviceOrderId,
      query,
    );
  }

  @Get(':id/url')
  @RequirePermissions('service_orders.manage', 'dashboard.view', 'vehicles.manage')
  signedUrl(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.attachmentsService.getSignedUrlForClient(user.organizationId, id);
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

  @Post('service-order/:serviceOrderId/prepare-upload')
  @RequirePermissions('service_orders.manage')
  prepareUpload(
    @CurrentUser() user: { organizationId: string },
    @Param('serviceOrderId') serviceOrderId: string,
    @Body() dto: PrepareAttachmentUploadDto,
  ) {
    return this.attachmentsService.prepareServiceOrderUpload(
      user.organizationId,
      serviceOrderId,
      dto,
    );
  }

  @Post('service-order/:serviceOrderId/confirm-upload')
  @RequirePermissions('service_orders.manage')
  confirmUpload(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('serviceOrderId') serviceOrderId: string,
    @Body() dto: ConfirmAttachmentUploadDto,
  ) {
    return this.attachmentsService.confirmServiceOrderUpload(
      user.organizationId,
      serviceOrderId,
      user.userId,
      dto,
    );
  }

  @Post('service-order/:serviceOrderId')
  @RequirePermissions('service_orders.manage')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  upload(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('serviceOrderId') serviceOrderId: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    @Query('category') category?: string,
    @Query('visibleToCustomer') visibleToCustomer?: string,
    @Query('showOnQuote') showOnQuote?: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Nenhum arquivo recebido no upload');
    }
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
