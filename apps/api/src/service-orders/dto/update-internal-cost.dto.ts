import { IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateInternalCostDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualUnitCost?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  actualBrand?: string | null;

  @IsOptional()
  @IsString()
  actualSupplierId?: string | null;

  @IsOptional()
  @IsString()
  purchaseOrderItemId?: string | null;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  purchasePaymentMethod?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNotes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
