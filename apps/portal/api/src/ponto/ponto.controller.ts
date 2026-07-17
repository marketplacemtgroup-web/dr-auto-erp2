import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TimeClockStatus } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { AuthUser } from '../shared/employee-scope.service';
import { AjustePontoDto, BaterPontoDto, RejectAjusteDto } from './dto/ponto.dto';
import { PontoService } from './ponto.service';

@Controller('ponto')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PontoController {
  constructor(private readonly ponto: PontoService) {}

  @Get('hoje')
  @RequirePermissions('ponto.ver', 'ponto.ver_todos', 'team.manage')
  hoje(
    @CurrentUser() user: AuthUser,
    @Query('date') date?: string,
  ) {
    return this.ponto.getHoje(user.organizationId, user, date);
  }

  @Get('painel')
  @RequirePermissions('ponto.ver', 'ponto.ver_todos', 'team.manage')
  painel(
    @CurrentUser() user: AuthUser,
    @Query('date') date?: string,
  ) {
    return this.ponto.getDashboard(user.organizationId, user, date);
  }

  @Post('bater')
  @RequirePermissions('ponto.bater', 'ponto.ajustar', 'team.manage')
  bater(
    @CurrentUser() user: AuthUser,
    @Body() dto: BaterPontoDto,
    @Ip() ip: string,
  ) {
    return this.ponto.bater(user.organizationId, user, dto, ip);
  }

  @Get('historico')
  @RequirePermissions('ponto.ver', 'ponto.ver_todos', 'team.manage')
  historico(
    @CurrentUser() user: AuthUser,
    @Query('employeeId') employeeId?: string,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
    @Query('status') status?: TimeClockStatus,
  ) {
    return this.ponto.getHistorico(user.organizationId, user, {
      employeeId,
      periodStart,
      periodEnd,
      status,
    });
  }

  @Get('ajustes-pendentes')
  @RequirePermissions('ponto.aprovar_ajuste', 'ponto.ver_todos', 'team.manage')
  ajustesPendentes(@CurrentUser() user: AuthUser) {
    return this.ponto.pendingAdjustments(user.organizationId, user);
  }

  @Get('relatorio')
  @RequirePermissions('ponto.exportar', 'ponto.ver_todos', 'team.manage')
  relatorio(
    @CurrentUser() user: AuthUser,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
    @Query('employeeId') employeeId?: string,
    @Query('jobTitleId') jobTitleId?: string,
    @Query('status') status?: TimeClockStatus,
  ) {
    return this.ponto.relatorio(user.organizationId, user, {
      employeeId,
      jobTitleId,
      periodStart,
      periodEnd,
      status,
    });
  }

  @Get('funcionario/:employeeId')
  @RequirePermissions('ponto.ver', 'ponto.ver_todos', 'team.manage')
  funcionario(
    @CurrentUser() user: AuthUser,
    @Param('employeeId') employeeId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.ponto.getFuncionarioDetail(
      user.organizationId,
      user,
      employeeId,
      periodStart,
      periodEnd,
    );
  }

  @Post('ajuste')
  @RequirePermissions('ponto.ajustar', 'team.manage')
  ajuste(@CurrentUser() user: AuthUser, @Body() dto: AjustePontoDto) {
    return this.ponto.ajuste(user.organizationId, user, dto);
  }

  @Patch('ajuste/:id/aprovar')
  @RequirePermissions('ponto.aprovar_ajuste', 'team.manage')
  aprovarAjuste(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.ponto.aprovarAjuste(user.organizationId, user, id);
  }

  @Patch('ajuste/:id/recusar')
  @RequirePermissions('ponto.aprovar_ajuste', 'team.manage')
  recusarAjuste(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectAjusteDto,
  ) {
    return this.ponto.recusarAjuste(user.organizationId, user, id, dto.reason);
  }
}
