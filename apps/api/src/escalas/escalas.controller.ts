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
import { ScheduleDayType, ScheduleStatus } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { AuthUser } from '../shared/employee-scope.service';
import { EscalasService } from './escalas.service';
import {
  CreateScheduleDto,
  CreateScheduleRecurrenceDto,
  UpdateScheduleDto,
} from './dto/schedule.dto';

@Controller('escalas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EscalasController {
  constructor(private readonly escalas: EscalasService) {}

  @Get('stats')
  @RequirePermissions('escalas.ver', 'escalas.ver_todas', 'team.manage')
  stats(
    @CurrentUser() user: AuthUser,
    @Query('date') date?: string,
  ) {
    return this.escalas.getStats(user.organizationId, date);
  }

  @Get()
  @RequirePermissions('escalas.ver', 'escalas.ver_todas', 'team.manage')
  list(
    @CurrentUser() user: AuthUser,
    @Query('employeeId') employeeId?: string,
    @Query('jobTitleId') jobTitleId?: string,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
    @Query('dayType') dayType?: ScheduleDayType,
    @Query('status') status?: ScheduleStatus,
  ) {
    return this.escalas.list(user.organizationId, user, {
      employeeId,
      jobTitleId,
      periodStart,
      periodEnd,
      dayType,
      status,
    });
  }

  @Get('relatorio')
  @RequirePermissions('escalas.exportar', 'escalas.ver_todas', 'team.manage')
  report(
    @CurrentUser() user: AuthUser,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.escalas.report(user.organizationId, user, {
      employeeId,
      periodStart,
      periodEnd,
    });
  }

  @Get('minha-escala')
  @RequirePermissions('escalas.ver', 'escalas.ver_todas', 'team.manage')
  minhaEscala(
    @CurrentUser() user: AuthUser,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    return this.escalas.minhaEscala(user.organizationId, user, periodStart, periodEnd);
  }

  @Get('funcionario/:employeeId')
  @RequirePermissions('escalas.ver', 'escalas.ver_todas', 'team.manage')
  byEmployee(
    @CurrentUser() user: AuthUser,
    @Param('employeeId') employeeId: string,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    return this.escalas.byEmployee(
      user.organizationId,
      user,
      employeeId,
      periodStart,
      periodEnd,
    );
  }

  @Get(':id')
  @RequirePermissions('escalas.ver', 'escalas.ver_todas', 'team.manage')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.escalas.findOne(user.organizationId, user, id);
  }

  @Post()
  @RequirePermissions('escalas.criar', 'team.manage')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateScheduleDto) {
    return this.escalas.create(user.organizationId, user, dto);
  }

  @Post('recorrencia')
  @RequirePermissions('escalas.criar', 'team.manage')
  createRecurrence(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateScheduleRecurrenceDto,
  ) {
    return this.escalas.createRecurrence(user.organizationId, user, dto);
  }

  @Patch(':id')
  @RequirePermissions('escalas.editar', 'team.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.escalas.update(user.organizationId, user, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('escalas.cancelar', 'team.manage')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.escalas.cancel(user.organizationId, user, id);
  }
}
