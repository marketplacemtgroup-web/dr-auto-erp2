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
  ) {
    return this.quotesService.list(user.organizationId, search, status);
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
