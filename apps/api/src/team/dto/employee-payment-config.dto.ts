import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { EmployeePaymentType, PaymentMethod, PaymentPeriodicity } from '@prisma/client';

export class EmployeePaymentConfigDto {
  @IsEnum(EmployeePaymentType)
  paymentType!: EmployeePaymentType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedSalary?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  paymentDay?: number;

  @IsOptional()
  @IsEnum(PaymentPeriodicity)
  periodicity?: PaymentPeriodicity;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  pixKey?: string;

  @IsOptional()
  @IsBoolean()
  allowBonus?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDiscount?: boolean;

  @IsOptional()
  @IsBoolean()
  allowAdvance?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
