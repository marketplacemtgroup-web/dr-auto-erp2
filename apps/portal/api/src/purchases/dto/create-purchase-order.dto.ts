import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PurchaseType } from '@prisma/client';

export class PurchaseOrderItemDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  supplierProductCode?: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitCost!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ipi?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  icms?: number;

  @IsOptional()
  @IsBoolean()
  movesStock?: boolean;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  serviceOrderId?: string;
}

export class CreatePurchaseOrderDto {
  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsString()
  @MinLength(2)
  supplierName!: string;

  @IsOptional()
  @IsEnum(PurchaseType)
  purchaseType?: PurchaseType;

  @IsOptional()
  @IsString()
  serviceOrderId?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  invoiceKey?: string;

  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  insurance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otherExpenses?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  surcharge?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  paymentTerms?: {
    installments?: number;
    firstDueDate?: string;
    intervalDays?: number;
    paymentMethod?: string;
  };

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items!: PurchaseOrderItemDto[];
}
