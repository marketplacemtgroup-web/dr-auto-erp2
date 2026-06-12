import { VehicleKind } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import {
  emptyToUndefined,
  normalizePlate,
  optionalInt,
  optionalYear,
} from './vehicle-field-transforms';

export class CreateVehicleDto {
  @IsNotEmpty({ message: 'Selecione um cliente.' })
  @IsString()
  customerId!: string;

  @Transform(({ value }) => normalizePlate(value))
  @IsString()
  @Length(7, 7, { message: 'Placa deve ter 7 caracteres (ex.: ABC1D23 ou ABC1234)' })
  plate!: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  brand?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  model?: string;

  @IsOptional()
  @Transform(({ value }) => optionalYear(value))
  @IsInt({ message: 'Ano inválido. Use 4 dígitos (ex.: 2020).' })
  @Min(1900, { message: 'Ano inválido. Use 4 dígitos (ex.: 2020).' })
  @Max(2100, { message: 'Ano inválido.' })
  year?: number;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  color?: string;

  @IsOptional()
  @IsEnum(VehicleKind)
  vehicleKind?: VehicleKind;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  chassis?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  renavam?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  fuelType?: string;

  @IsOptional()
  @Transform(({ value }) => optionalInt(value))
  @IsInt({ message: 'KM inválido. Use apenas números.' })
  @Min(0, { message: 'KM não pode ser negativo.' })
  currentKm?: number;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  notes?: string;
}
