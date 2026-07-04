import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { FinancialAccountType } from '@prisma/client';

export class CreateFinancialAccountDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(FinancialAccountType)
  type!: FinancialAccountType;

  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @IsString()
  agency?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  holder?: string;

  @IsOptional()
  @IsNumber()
  openingBalance?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  allowsMovement?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateFinancialAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(FinancialAccountType)
  type?: FinancialAccountType;

  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @IsString()
  agency?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  holder?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  openingBalance?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  allowsMovement?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  status?: 'ACTIVE' | 'INACTIVE';
}

export class CreateCostCenterDto {
  @IsString()
  @MinLength(2)
  name!: string;
}
