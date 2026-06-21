import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EmployeeRequestType } from '@prisma/client';

export class CreateEmployeeRequestDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsEnum(EmployeeRequestType)
  requestType!: EmployeeRequestType;

  @IsDateString()
  referenceDate!: string;

  @IsString()
  @MaxLength(4000)
  description!: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class RejectRequestDto {
  @IsString()
  @MaxLength(2000)
  reason!: string;
}
