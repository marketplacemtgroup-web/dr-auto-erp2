import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { CashController } from './cash.controller';
import { CashService } from './cash.service';

@Module({
  imports: [AccountsModule],
  controllers: [CashController],
  providers: [CashService],
  exports: [CashService],
})
export class CashModule {}
