import { Module } from '@nestjs/common';
import { TeamModule } from '../team/team.module';
import { EscalasController } from './escalas.controller';
import { EscalasService } from './escalas.service';

@Module({
  imports: [TeamModule],
  controllers: [EscalasController],
  providers: [EscalasService],
  exports: [EscalasService],
})
export class EscalasModule {}
