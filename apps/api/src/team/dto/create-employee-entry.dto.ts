import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { EmployeeEntryType, PaymentMethod } from '@prisma/client';

export class CreateEmployeeEntryDto {
  @IsString()
  employeeId!: string;

  @IsEnum(EmployeeEntryType)
  entryType!: EmployeeEntryType;

  @IsString()
  description!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsDateString()
  entryDate!: string;

  @IsOptional()
  @IsDateString()
  competence?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  notes?: string;
}
