import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdjustStockDto {
  @IsInt()
  delta!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
