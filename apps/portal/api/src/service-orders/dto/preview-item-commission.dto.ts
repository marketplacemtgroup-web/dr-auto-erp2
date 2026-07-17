import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ServiceOrderItemType } from '@prisma/client';

export class PreviewItemCommissionDto {
  @IsEnum(ServiceOrderItemType)
  itemType!: ServiceOrderItemType;

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
  discount?: number;

  @IsOptional()
  @IsString()
  catalogItemId?: string | null;

  @IsOptional()
  @IsString()
  productId?: string | null;

  @IsOptional()
  @IsString()
  executorId?: string | null;

  @IsOptional()
  @IsString()
  coExecutorId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  coExecutorSplitPct?: number | null;

  @IsOptional()
  @IsString()
  soldById?: string | null;
}
