import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePurchaseOrderDto {
  @IsString()
  @IsNotEmpty()
  supplierName!: string;

  @IsNumber()
  totalAmount!: number;

  @IsString()
  @IsOptional()
  number?: string;
}

