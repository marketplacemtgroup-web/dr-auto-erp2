import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreatePayrollDto {
  @IsString()
  employeeId!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
