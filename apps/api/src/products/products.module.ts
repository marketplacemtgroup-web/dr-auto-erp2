import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { StockMovementService } from './stock-movement.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, StockMovementService],
  exports: [ProductsService, StockMovementService],
})
export class ProductsModule {}
