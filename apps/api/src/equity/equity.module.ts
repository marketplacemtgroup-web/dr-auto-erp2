import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { EquityController } from './equity.controller';
import { EquityService } from './equity.service';

@Module({
  imports: [AccountsModule],
  controllers: [EquityController],
  providers: [EquityService],
  exports: [EquityService],
})
export class EquityModule {}
