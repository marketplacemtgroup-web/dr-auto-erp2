import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateServiceCatalogDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  warrantyDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
