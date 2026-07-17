import { Module } from '@nestjs/common';
import { EscalasModule } from '../escalas/escalas.module';
import { PontoModule } from '../ponto/ponto.module';
import { TeamModule } from '../team/team.module';
import { SolicitacoesFuncionariosController } from './solicitacoes-funcionarios.controller';
import { SolicitacoesFuncionariosService } from './solicitacoes-funcionarios.service';

@Module({
  imports: [TeamModule, EscalasModule, PontoModule],
  controllers: [SolicitacoesFuncionariosController],
  providers: [SolicitacoesFuncionariosService],
  exports: [SolicitacoesFuncionariosService],
})
export class SolicitacoesFuncionariosModule {}
