import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  CommissionBase,
  CommissionRuleType,
  CommissionTrigger,
} from '@prisma/client';

export class CreateCommissionRuleDto {
  @IsString()
  employeeId!: string;

  @IsEnum(CommissionRuleType)
  ruleType!: CommissionRuleType;

  @IsEnum(CommissionBase)
  baseCalculation!: CommissionBase;

  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedAmount?: number;

  @IsOptional()
  @IsString()
  catalogItemId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsEnum(CommissionTrigger)
  trigger?: CommissionTrigger;

  @IsOptional()
  @IsBoolean()
  considerDiscount?: boolean;

  @IsOptional()
  @IsBoolean()
  considerOnlyReceived?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
