import { Module, forwardRef } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { FinancialModule } from '../financial/financial.module';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

@Module({
  imports: [AccountsModule, forwardRef(() => FinancialModule)],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
