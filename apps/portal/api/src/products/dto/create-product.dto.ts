import { IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, MaxLength, MinLength } from 'class-validator';
import { ProductStatus } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  internalCode?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  ncm?: string;

  @IsOptional()
  @IsString()
  cest?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  stock?: number;

  @IsOptional()
  @IsInt()
  minStock?: number;

  @IsOptional()
  @IsInt()
  maxStock?: number;

  @IsOptional()
  @IsNumber()
  markup?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @IsOptional()
  @IsIn(['ACTIVE', 'PROVISIONAL'])
  status?: ProductStatus;

  @IsOptional()
  needsReview?: boolean;
}
