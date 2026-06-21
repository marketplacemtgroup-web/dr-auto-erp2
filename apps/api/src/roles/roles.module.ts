import { Module } from '@nestjs/common';
import { RolesBootstrapService } from './roles-bootstrap.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  controllers: [RolesController],
  providers: [RolesService, RolesBootstrapService],
  exports: [RolesService],
})
export class RolesModule {}
