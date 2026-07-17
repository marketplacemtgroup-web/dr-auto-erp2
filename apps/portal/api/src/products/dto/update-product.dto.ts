import { IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ProductStatus } from '@prisma/client';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  ncm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  location?: string;

  @IsOptional()
  @IsString()
  internalCode?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

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
  @IsInt()
  @Min(0)
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
  @IsInt()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @IsIn(['ACTIVE', 'PROVISIONAL'])
  status?: ProductStatus;

  @IsOptional()
  needsReview?: boolean;
}
