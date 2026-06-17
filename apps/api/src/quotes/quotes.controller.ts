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
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { ApproveLinesDto } from './dto/approve-lines.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { QuotesService } from './quotes.service';

@Controller('quotes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @RequirePermissions('quotes.manage')
  create(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateQuoteDto,
  ) {
    return this.quotesService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('quotes.manage', 'dashboard.view')
  list(
    @CurrentUser() user: { organizationId: string },
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('includeApproved') includeApproved?: string,
  ) {
    return this.quotesService.list(
      user.organizationId,
      search,
      status,
      includeApproved === 'true',
    );
  }

  @Get(':id')
  @RequirePermissions('quotes.manage', 'dashboard.view')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.quotesService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('quotes.manage')
  update(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.quotesService.update(user.organizationId, id, dto);
  }

  @Patch(':id/approve')
  @RequirePermissions('quotes.manage')
  approve(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body() dto?: ApproveLinesDto,
  ) {
    return this.quotesService.approveFromOffice(user.organizationId, id, user.userId, dto);
  }

  @Post(':id/reopen-supplement')
  @RequirePermissions('quotes.manage')
  reopenSupplement(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
  ) {
    return this.quotesService.reopenForSupplement(user.organizationId, id, user.userId);
  }

  @Patch(':id/reject')
  @RequirePermissions('quotes.manage')
  reject(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
  ) {
    return this.quotesService.rejectFromOffice(user.organizationId, id, user.userId);
  }

  @Post(':id/share-link')
  @RequirePermissions('quotes.manage')
  shareLink(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.quotesService.createShareLink(user.organizationId, id);
  }

  @Delete(':id')
  @RequirePermissions('quotes.manage')
  remove(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.quotesService.remove(user.organizationId, id);
  }
}
