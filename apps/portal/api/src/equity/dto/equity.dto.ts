import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { PartnerWithdrawalType } from '@prisma/client';

export class CreateTransferDto {
  @IsString()
  fromAccountId!: string;

  @IsString()
  toAccountId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsDateString()
  transferDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}

export class CreateContributionDto {
  @IsString()
  @MinLength(2)
  partnerName!: string;

  @IsOptional()
  @IsString()
  fromAccountId?: string;

  @IsString()
  toAccountId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsDateString()
  contributionDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateWithdrawalDto {
  @IsString()
  @MinLength(2)
  partnerName!: string;

  @IsString()
  fromAccountId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsDateString()
  withdrawalDate!: string;

  @IsEnum(PartnerWithdrawalType)
  withdrawalType!: PartnerWithdrawalType;

  @IsOptional()
  @IsString()
  reason?: string;
}
