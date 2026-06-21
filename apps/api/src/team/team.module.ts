import { Module } from '@nestjs/common';
import { CommissionEngineService } from './commission-engine.service';
import { CommissionRulesService } from './commission-rules.service';
import { EmployeeDocumentsService } from './employee-documents.service';
import { EmployeeEntriesService } from './employee-entries.service';
import { EmployeeAccessService } from './employee-access.service';
import { EmployeesService } from './employees.service';
import { JobTitlesService } from './job-titles.service';
import { PayrollService } from './payroll.service';
import { TeamActionLogService } from './team-action-log.service';
import { TeamController } from './team.controller';

@Module({
  controllers: [TeamController],
  providers: [
    TeamActionLogService,
    CommissionEngineService,
    EmployeeAccessService,
    EmployeesService,
    JobTitlesService,
    CommissionRulesService,
    EmployeeEntriesService,
    EmployeeDocumentsService,
    PayrollService,
  ],
  exports: [CommissionEngineService, EmployeesService, TeamActionLogService, CommissionRulesService],
})
export class TeamModule {}
