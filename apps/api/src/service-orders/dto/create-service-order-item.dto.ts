import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';
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
  soldById?: string;

  @IsOptional()
  @IsString()
  appliedById?: string;

  @IsOptional()
  @IsString()
  separatedById?: string;
}
