import { Module, forwardRef } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ReportsModule } from '../reports/reports.module';
import { TeamModule } from '../team/team.module';
import { AccountsModule } from '../accounts/accounts.module';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';

@Module({
  imports: [
    ReportsModule,
    AppointmentsModule,
    TeamModule,
    DashboardModule,
    AccountsModule,
    forwardRef(() => ServiceOrdersModule),
  ],
  controllers: [FinancialController],
  providers: [FinancialService],
  exports: [FinancialService],
})
export class FinancialModule {}

