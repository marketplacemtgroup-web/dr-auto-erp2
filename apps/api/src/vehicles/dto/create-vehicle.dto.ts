import { IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { VehicleKind } from '@prisma/client';

export class CreateVehicleDto {
  @IsString()
  customerId!: string;

  @IsString()
  @MinLength(5)
  plate!: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  year?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsEnum(VehicleKind)
  vehicleKind?: VehicleKind;

  @IsOptional()
  @IsString()
  chassis?: string;

  @IsOptional()
  @IsString()
  renavam?: string;

  @IsOptional()
  @IsString()
  fuelType?: string;

  @IsOptional()
  @IsInt()
  currentKm?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
