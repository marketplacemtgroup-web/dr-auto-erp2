import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [AttachmentsModule],
  controllers: [VehiclesController],
  providers: [VehiclesService],
})
export class VehiclesModule {}
