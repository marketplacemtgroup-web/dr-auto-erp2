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
  @MaxLength(500)
  statusReason?: string;
}
