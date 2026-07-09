import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';
import { ServiceOrderItemType } from '@prisma/client';

export class CreateServiceOrderItemDto {
  @IsString()
  @MaxLength(500)
  description!: string;

  @IsOptional()
  @IsEnum(ServiceOrderItemType)
  itemType?: ServiceOrderItemType;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  catalogItemId?: string;

  @IsOptional()
  @IsString()
  outsourcedServiceId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  executorId?: string;

  @IsOptional()
  @IsString()
  coExecutorId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  coExecutorSplitPct?: number;

  @IsOptional()
  @IsString()
  soldById?: string;

  @IsOptional()
  @IsBoolean()
  isQuickPart?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  quickPartCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  partBrand?: string;

  @IsOptional()
  @IsString()
  suggestedSupplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNotes?: string;

  @IsOptional()
  @IsString()
  appliedById?: string;

  @IsOptional()
  @IsString()
  separatedById?: string;
}
