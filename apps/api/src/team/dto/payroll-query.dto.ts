import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PayrollStatus } from '@prisma/client';

export class PayrollQueryDto {
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  jobTitleId?: string;

  @IsOptional()
  @IsEnum(PayrollStatus)
  status?: PayrollStatus;
}
