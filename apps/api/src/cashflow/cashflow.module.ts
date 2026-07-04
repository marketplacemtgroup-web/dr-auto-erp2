import { Module } from '@nestjs/common';
import { CashFlowController } from './cashflow.controller';
import { CashFlowService } from './cashflow.service';
import { ReconciliationService } from './reconciliation.service';

@Module({
  controllers: [CashFlowController],
  providers: [CashFlowService, ReconciliationService],
  exports: [CashFlowService, ReconciliationService],
})
export class CashFlowModule {}
