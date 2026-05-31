import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { FinancialEntryType, PaymentMethod } from '@prisma/client';

export class CreateFinancialEntryDto {
  @IsString()
  @MinLength(2)
  description!: string;

  @IsEnum(FinancialEntryType)
  type!: FinancialEntryType;

  @IsDateString()
  dueDate!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  serviceOrderId?: string;

  @IsOptional()
  @IsString()
  quoteId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

export class CreateInstallmentsDto extends CreateFinancialEntryDto {
  @IsInt()
  @Min(2)
  installments!: number;
}

export class PayFinancialEntryDto {
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  registerInCash?: boolean;
}
