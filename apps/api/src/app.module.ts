import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProductsModule } from './products/products.module';
import { QuotesModule } from './quotes/quotes.module';
import { ServiceOrdersModule } from './service-orders/service-orders.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { PortalModule } from './portal/portal.module';
import { PrismaModule } from './prisma/prisma.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { PurchasesModule } from './purchases/purchases.module';
import { FinancialModule } from './financial/financial.module';
import { ReportsModule } from './reports/reports.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ServiceCatalogModule } from './service-catalog/service-catalog.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { CashModule } from './cash/cash.module';
import { AuditModule } from './audit/audit.module';
import { SearchModule } from './search/search.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StorageModule } from './storage/storage.module';
import { TeamModule } from './team/team.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    AuditModule,
    EventsModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    RolesModule,
    DashboardModule,
    CustomersModule,
    VehiclesModule,
    ServiceOrdersModule,
    QuotesModule,
    ProductsModule,
    PortalModule,
    PurchasesModule,
    FinancialModule,
    ReportsModule,
    AttachmentsModule,
    ServiceCatalogModule,
    AppointmentsModule,
    CashModule,
    SearchModule,
    NotificationsModule,
    TeamModule,
  ],
})
export class AppModule {}
