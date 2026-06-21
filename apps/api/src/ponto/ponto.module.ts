import { Module } from '@nestjs/common';
import { TeamModule } from '../team/team.module';
import { PontoController } from './ponto.controller';
import { PontoService } from './ponto.service';

@Module({
  imports: [TeamModule],
  controllers: [PontoController],
  providers: [PontoService],
  exports: [PontoService],
})
export class PontoModule {}
