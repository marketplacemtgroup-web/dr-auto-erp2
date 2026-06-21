import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  TimeClockEntryType,
  TimeClockOrigin,
  TimeClockStatus,
} from '@prisma/client';

export class BaterPontoDto {
  @IsEnum(TimeClockEntryType)
  entryType!: TimeClockEntryType;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  addressApprox?: string;

  @IsOptional()
  @IsString()
  device?: string;

  @IsOptional()
  @IsString()
  selfieUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsEnum(TimeClockOrigin)
  origin?: TimeClockOrigin;
}

export class AjustePontoDto {
  @IsString()
  employeeId!: string;

  @IsDateString()
  workDate!: string;

  @IsOptional()
  @IsDateString()
  clockIn?: string;

  @IsOptional()
  @IsDateString()
  breakStart?: string;

  @IsOptional()
  @IsDateString()
  breakEnd?: string;

  @IsOptional()
  @IsDateString()
  clockOut?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class RejectAjusteDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class AprovarAjusteDto {
  @IsOptional()
  @IsEnum(TimeClockStatus)
  status?: TimeClockStatus;
}
