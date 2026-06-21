import { Module } from '@nestjs/common';
import { EscalasModule } from '../escalas/escalas.module';
import { PontoModule } from '../ponto/ponto.module';
import { SolicitacoesFuncionariosModule } from '../solicitacoes-funcionarios/solicitacoes-funcionarios.module';
import { TeamModule } from '../team/team.module';
import { ColaboradorAppController } from './colaborador-app.controller';
import { ColaboradorAppService } from './colaborador-app.service';

@Module({
  imports: [PontoModule, EscalasModule, SolicitacoesFuncionariosModule, TeamModule],
  controllers: [ColaboradorAppController],
  providers: [ColaboradorAppService],
})
export class ColaboradorAppModule {}
