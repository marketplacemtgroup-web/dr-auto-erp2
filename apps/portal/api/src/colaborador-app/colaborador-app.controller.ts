import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TimeClockOrigin } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { EscalasService } from '../escalas/escalas.service';
import { BaterPontoDto } from '../ponto/dto/ponto.dto';
import { PontoService } from '../ponto/ponto.service';
import { CreateEmployeeRequestDto } from '../solicitacoes-funcionarios/dto/request.dto';
import { SolicitacoesFuncionariosService } from '../solicitacoes-funcionarios/solicitacoes-funcionarios.service';
import { AuthUser } from '../shared/employee-scope.service';
import { ColaboradorAppService } from './colaborador-app.service';

/** Endpoints do App Colaborador (mesmo JWT do ERP). */
@Controller('colaborador-app')
@UseGuards(JwtAuthGuard)
export class ColaboradorAppController {
  constructor(
    private readonly colaborador: ColaboradorAppService,
    private readonly ponto: PontoService,
    private readonly escalas: EscalasService,
    private readonly solicitacoes: SolicitacoesFuncionariosService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.colaborador.getMe(user);
  }

  @Post('me/foto')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadPhoto(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.colaborador.uploadPhoto(user, file);
  }

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.colaborador.getDashboard(user);
  }

  @Get('minhas-os')
  minhasOs(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('periodo') _periodo?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.colaborador.listMyOrders(user, {
      status,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('minhas-os/:id')
  minhaOsDetalhe(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.colaborador.getMyOrderDetail(user, id);
  }

  @Get('comissoes')
  comissoes(
    @CurrentUser() user: AuthUser,
    @Query('periodo') periodo?: string,
    @Query('status') _status?: string,
    @Query('page') _page?: string,
    @Query('limit') _limit?: string,
  ) {
    return this.colaborador.getCommissions(user, periodo);
  }

  @Get('comissoes/:id')
  comissaoDetalhe(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.colaborador.getCommissionDetail(user, id);
  }

  @Get('desempenho')
  desempenho(
    @CurrentUser() user: AuthUser,
    @Query('periodo') periodo?: string,
  ) {
    return this.colaborador.getDesempenho(user, periodo);
  }

  @Get('documentos')
  documentos(@CurrentUser() user: AuthUser) {
    return this.colaborador.listDocuments(user);
  }

  @Get('ponto/hoje')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('ponto.ver', 'ponto.bater', 'team.manage')
  pontoHoje(@CurrentUser() user: AuthUser) {
    return this.ponto.getHoje(user.organizationId, user);
  }

  @Post('ponto/bater')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('ponto.bater', 'team.manage')
  baterPonto(
    @CurrentUser() user: AuthUser,
    @Body() dto: BaterPontoDto,
    @Ip() ip: string,
  ) {
    return this.ponto.bater(
      user.organizationId,
      user,
      { ...dto, origin: TimeClockOrigin.APP_COLABORADOR },
      ip,
    );
  }

  @Get('ponto/historico')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('ponto.ver', 'team.manage')
  pontoHistorico(
    @CurrentUser() user: AuthUser,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    return this.ponto.getHistorico(user.organizationId, user, {
      periodStart,
      periodEnd,
    });
  }

  @Get('escala')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('escalas.ver', 'team.manage')
  minhaEscala(
    @CurrentUser() user: AuthUser,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    return this.escalas.minhaEscala(user.organizationId, user, periodStart, periodEnd);
  }

  @Get('solicitacoes')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('solicitacoes.ver', 'solicitacoes.criar', 'team.manage')
  minhasSolicitacoes(@CurrentUser() user: AuthUser) {
    return this.solicitacoes.list(user.organizationId, user, {});
  }

  @Post('solicitacoes')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('solicitacoes.criar', 'team.manage')
  criarSolicitacao(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateEmployeeRequestDto,
  ) {
    return this.solicitacoes.create(user.organizationId, user, dto);
  }
}
