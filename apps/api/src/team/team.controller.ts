import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmployeeStatus } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateEmployeeEntryDto } from './dto/create-employee-entry.dto';
import { CreateJobTitleDto } from './dto/create-job-title.dto';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { EmployeePaymentConfigDto } from './dto/employee-payment-config.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import {
  CreateEmployeeAccessDto,
  ResetEmployeePasswordDto,
  UpdateEmployeeAccessDto,
} from './dto/employee-access.dto';
import { CommissionRulesService } from './commission-rules.service';
import { EmployeeAccessService } from './employee-access.service';
import { EmployeeEntriesService } from './employee-entries.service';
import { EmployeesService } from './employees.service';
import { JobTitlesService } from './job-titles.service';
import { PayrollService } from './payroll.service';

@Controller('team')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TeamController {
  constructor(
    private readonly employees: EmployeesService,
    private readonly employeeAccess: EmployeeAccessService,
    private readonly jobTitles: JobTitlesService,
    private readonly commissionRules: CommissionRulesService,
    private readonly entries: EmployeeEntriesService,
    private readonly payroll: PayrollService,
  ) {}

  @Get('stats')
  @RequirePermissions('team.manage', 'commissions.view', 'payroll.manage')
  stats(@CurrentUser() user: { organizationId: string }) {
    return this.employees.listStats(user.organizationId);
  }

  @Get('employees')
  @RequirePermissions('team.manage', 'service_orders.manage', 'commissions.view')
  listEmployees(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: EmployeeStatus,
    @Query('jobTitleId') jobTitleId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('search') search?: string,
  ) {
    return this.employees.list(user.organizationId, {
      status,
      jobTitleId,
      employeeId,
      search,
    });
  }

  @Get('employees/technicians')
  @RequirePermissions('team.manage', 'service_orders.manage')
  technicians(@CurrentUser() user: { organizationId: string }) {
    return this.employees.listTechnicians(user.organizationId);
  }

  @Get('employees/:id')
  @RequirePermissions('team.manage', 'team.view_salaries', 'commissions.view')
  getEmployee(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.employees.findOne(user.organizationId, id);
  }

  @Post('employees')
  @RequirePermissions('team.manage')
  createEmployee(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employees.create(user.organizationId, dto, user.userId);
  }

  @Patch('employees/:id')
  @RequirePermissions('team.manage')
  updateEmployee(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employees.update(user.organizationId, id, dto, user.userId);
  }

  @Get('login-email-domain')
  @RequirePermissions('team.manage', 'users.manage')
  getLoginEmailDomain(@CurrentUser() user: { organizationId: string }) {
    return this.employeeAccess.getLoginEmailDomain(user.organizationId);
  }

  @Post('employees/:id/access')
  @RequirePermissions('team.manage', 'users.manage')
  createEmployeeAccess(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body() dto: CreateEmployeeAccessDto,
  ) {
    return this.employeeAccess.provisionAccess(
      user.organizationId,
      id,
      dto,
      user.userId,
    );
  }

  @Patch('employees/:id/access')
  @RequirePermissions('team.manage', 'users.manage')
  updateEmployeeAccess(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeAccessDto,
  ) {
    return this.employeeAccess.updateAccess(
      user.organizationId,
      id,
      dto,
      user.userId,
    );
  }

  @Post('employees/:id/access/reset-password')
  @RequirePermissions('team.manage', 'users.manage')
  resetEmployeePassword(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body() dto: ResetEmployeePasswordDto,
  ) {
    return this.employeeAccess.resetPassword(
      user.organizationId,
      id,
      dto,
      user.userId,
    );
  }

  @Post('employees/:id/payment-config')
  @RequirePermissions('team.manage', 'team.view_salaries')
  upsertPaymentConfig(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body() dto: EmployeePaymentConfigDto,
  ) {
    return this.employees.upsertPaymentConfig(
      user.organizationId,
      id,
      dto,
      user.userId,
    );
  }

  @Get('job-titles')
  @RequirePermissions('team.manage')
  listJobTitles(@CurrentUser() user: { organizationId: string }) {
    return this.jobTitles.list(user.organizationId);
  }

  @Post('job-titles')
  @RequirePermissions('team.manage')
  createJobTitle(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateJobTitleDto,
  ) {
    return this.jobTitles.create(user.organizationId, dto);
  }

  @Patch('job-titles/:id')
  @RequirePermissions('team.manage')
  updateJobTitle(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: Partial<CreateJobTitleDto>,
  ) {
    return this.jobTitles.update(user.organizationId, id, dto);
  }

  @Get('commission-rules')
  @RequirePermissions('commissions.manage', 'commissions.view', 'team.manage')
  listRules(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeId') employeeId?: string,
  ) {
    return this.commissionRules.list(user.organizationId, employeeId);
  }

  @Post('commission-rules')
  @RequirePermissions('commissions.manage', 'team.manage')
  createRule(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Body() dto: CreateCommissionRuleDto,
  ) {
    return this.commissionRules.create(user.organizationId, dto, user.userId);
  }

  @Patch('commission-rules/:id')
  @RequirePermissions('commissions.manage', 'team.manage')
  updateRule(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body() dto: Partial<CreateCommissionRuleDto>,
  ) {
    return this.commissionRules.update(user.organizationId, id, dto, user.userId);
  }

  @Post('commission-rules/:id/duplicate')
  @RequirePermissions('commissions.manage', 'team.manage')
  duplicateRule(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
  ) {
    return this.commissionRules.duplicate(user.organizationId, id, user.userId);
  }

  @Get('entries')
  @RequirePermissions('team.manage', 'payroll.manage', 'team.view_salaries')
  listEntries(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeId') employeeId?: string,
    @Query('entryType') entryType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.entries.list(user.organizationId, {
      employeeId,
      entryType,
      from,
      to,
    });
  }

  @Post('entries')
  @RequirePermissions('team.manage', 'payroll.manage')
  createEntry(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Body() dto: CreateEmployeeEntryDto,
  ) {
    return this.entries.create(user.organizationId, dto, user.userId);
  }

  @Patch('entries/:id/cancel')
  @RequirePermissions('team.manage', 'payroll.manage')
  cancelEntry(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
  ) {
    return this.entries.cancel(user.organizationId, id, user.userId);
  }

  @Get('payroll')
  @RequirePermissions('payroll.manage', 'team.view_salaries')
  listPayroll(
    @CurrentUser() user: { organizationId: string },
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.payroll.list(user.organizationId, {
      periodStart,
      periodEnd,
      employeeId,
      status,
    });
  }

  @Get('payroll/preview')
  @RequirePermissions('payroll.manage', 'team.view_salaries')
  previewPayroll(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeId') employeeId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.payroll.buildPreview(
      user.organizationId,
      employeeId,
      periodStart,
      periodEnd,
    );
  }

  @Get('payroll/:id')
  @RequirePermissions('payroll.manage', 'team.view_salaries')
  getPayroll(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.payroll.findOne(user.organizationId, id);
  }

  @Post('payroll')
  @RequirePermissions('payroll.manage')
  createPayroll(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Body() dto: CreatePayrollDto,
  ) {
    return this.payroll.create(user.organizationId, dto, user.userId);
  }

  @Patch('payroll/:id/close')
  @RequirePermissions('payroll.manage')
  closePayroll(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
  ) {
    return this.payroll.close(user.organizationId, id, user.userId);
  }

  @Patch('payroll/:id/paid')
  @RequirePermissions('payroll.manage')
  markPaid(
    @CurrentUser() user: { organizationId: string; userId: string },
    @Param('id') id: string,
    @Body('paymentMethod') paymentMethod?: string,
  ) {
    return this.payroll.markPaid(
      user.organizationId,
      id,
      paymentMethod,
      user.userId,
    );
  }

  @Get('productivity')
  @RequirePermissions('team.manage', 'commissions.view')
  productivity(
    @CurrentUser() user: { organizationId: string },
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.employees.productivity(
      user.organizationId,
      periodStart,
      periodEnd,
      employeeId,
    );
  }

  @Get('commissions')
  @RequirePermissions('commissions.view', 'commissions.manage', 'team.manage')
  listCommissions(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.commissionRules.listGenerated(user.organizationId, {
      employeeId,
      status,
    });
  }
}
