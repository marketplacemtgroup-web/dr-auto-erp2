import { IsBoolean, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateOutsourcedServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
