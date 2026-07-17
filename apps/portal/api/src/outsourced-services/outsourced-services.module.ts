import { Module } from '@nestjs/common';
import { OutsourcedServicesController } from './outsourced-services.controller';
import { OutsourcedServicesService } from './outsourced-services.service';

@Module({
  controllers: [OutsourcedServicesController],
  providers: [OutsourcedServicesService],
  exports: [OutsourcedServicesService],
})
export class OutsourcedServicesModule {}
