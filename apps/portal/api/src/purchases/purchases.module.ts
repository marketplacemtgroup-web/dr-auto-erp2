import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FinancialModule } from '../financial/financial.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [FinancialModule, AuditModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
