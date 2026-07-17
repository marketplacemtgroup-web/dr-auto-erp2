import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';
import { ServiceOrderItemType } from '@prisma/client';

export class UpdateServiceOrderItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(ServiceOrderItemType)
  itemType?: ServiceOrderItemType;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

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

  @IsOptional()
  @IsString()
  appliedById?: string | null;

  @IsOptional()
  @IsString()
  separatedById?: string | null;

  @IsOptional()
  @IsString()
  outsourcedServiceId?: string | null;
}
