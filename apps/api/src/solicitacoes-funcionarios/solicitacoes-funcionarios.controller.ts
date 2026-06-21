import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmployeeRequestStatus, EmployeeRequestType } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { AuthUser } from '../shared/employee-scope.service';
import { CreateEmployeeRequestDto, RejectRequestDto } from './dto/request.dto';
import { SolicitacoesFuncionariosService } from './solicitacoes-funcionarios.service';

@Controller('solicitacoes-funcionarios')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SolicitacoesFuncionariosController {
  constructor(private readonly solicitacoes: SolicitacoesFuncionariosService) {}

  @Get()
  @RequirePermissions('solicitacoes.ver', 'solicitacoes.aprovar', 'team.manage')
  list(
    @CurrentUser() user: AuthUser,
    @Query('employeeId') employeeId?: string,
    @Query('requestType') requestType?: EmployeeRequestType,
    @Query('status') status?: EmployeeRequestStatus,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    return this.solicitacoes.list(user.organizationId, user, {
      employeeId,
      requestType,
      status,
      periodStart,
      periodEnd,
    });
  }

  @Get(':id')
  @RequirePermissions('solicitacoes.ver', 'solicitacoes.aprovar', 'team.manage')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.solicitacoes.findOne(user.organizationId, user, id);
  }

  @Post()
  @RequirePermissions('solicitacoes.criar', 'team.manage')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEmployeeRequestDto) {
    return this.solicitacoes.create(user.organizationId, user, dto);
  }

  @Patch(':id/aprovar')
  @RequirePermissions('solicitacoes.aprovar', 'team.manage')
  aprovar(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.solicitacoes.aprovar(user.organizationId, user, id);
  }

  @Patch(':id/recusar')
  @RequirePermissions('solicitacoes.recusar', 'team.manage')
  recusar(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectRequestDto,
  ) {
    return this.solicitacoes.recusar(user.organizationId, user, id, dto.reason);
  }

  @Patch(':id/cancelar')
  @RequirePermissions('solicitacoes.criar', 'solicitacoes.aprovar', 'team.manage')
  cancelar(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.solicitacoes.cancelar(user.organizationId, user, id);
  }
}
