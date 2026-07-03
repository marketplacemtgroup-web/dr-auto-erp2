import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
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

  /** Marca o lançamento como já pago/recebido no ato da criação. */
  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  /** Data efetiva do pagamento/recebimento (competência que define o mês nos relatórios). */
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}

export class CreateInstallmentsDto extends CreateFinancialEntryDto {
  @IsInt()
  @Min(2)
  installments!: number;
}

export class PayFinancialSplitDto {
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsBoolean()
  registerInCash?: boolean;
}

export class PayFinancialEntryDto {
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsBoolean()
  registerInCash?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PayFinancialSplitDto)
  splits?: PayFinancialSplitDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  interestAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  penaltyAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  feeAmount?: number;
}
