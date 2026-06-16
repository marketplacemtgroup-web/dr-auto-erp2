import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';
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
  discount?: number;

  @IsOptional()
  @IsString()
  executorId?: string | null;

  @IsOptional()
  @IsString()
  soldById?: string | null;

  @IsOptional()
  @IsString()
  appliedById?: string | null;

  @IsOptional()
  @IsString()
  separatedById?: string | null;
}
