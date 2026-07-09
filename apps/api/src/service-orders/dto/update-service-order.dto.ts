import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ServiceOrderPriority, ServiceOrderStatus } from '@prisma/client';

export class UpdateServiceOrderDto {
  @IsOptional()
  @IsEnum(ServiceOrderStatus)
  status?: ServiceOrderStatus;

  @IsOptional()
  @IsEnum(ServiceOrderPriority)
  priority?: ServiceOrderPriority;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serviceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  entryChannel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  bay?: string;

  @IsOptional()
  @IsInt()
  entryKm?: number;

  @IsOptional()
  @IsDateString()
  enteredAt?: string | null;

  @IsOptional()
  @IsString()
  consultantMemberId?: string | null;

  @IsOptional()
  @IsString()
  mechanicMemberId?: string | null;

  @IsOptional()
  @IsString()
  generalResponsibleId?: string | null;

  @IsOptional()
  @IsString()
  checklistById?: string | null;

  @IsOptional()
  @IsString()
  diagnosisById?: string | null;

  @IsOptional()
  @IsString()
  quoteById?: string | null;

  @IsOptional()
  @IsString()
  executionById?: string | null;

  @IsOptional()
  @IsString()
  coExecutionById?: string | null;

  @IsOptional()
  @IsString()
  finalizedById?: string | null;

  @IsOptional()
  @IsDateString()
  estimatedAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  complaint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  diagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  internalNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  customerVisibleNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  paymentAgreement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  statusReason?: string;

  @IsOptional()
  @IsInt()
  revisionIntervalKm?: number | null;

  @IsOptional()
  @IsInt()
  revisionIntervalMonths?: number | null;

  @IsOptional()
  @IsInt()
  oilChangeIntervalKm?: number | null;

  @IsOptional()
  @IsInt()
  oilChangeIntervalMonths?: number | null;
}
