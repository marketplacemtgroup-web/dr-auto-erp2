import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenCashDto {
  @IsNumber()
  @Min(0)
  openingBalance!: number;
}

export class CloseCashDto {
  @IsNumber()
  @Min(0)
  closingBalance!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CashMovementDto {
  @IsString()
  movementType!: 'SUPPLY' | 'WITHDRAWAL';

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;
}
