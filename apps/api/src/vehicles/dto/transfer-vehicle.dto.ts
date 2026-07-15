import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { emptyToUndefined } from './vehicle-field-transforms';

export class TransferVehicleDto {
  @IsNotEmpty({ message: 'Selecione o novo cliente.' })
  @IsString()
  customerId!: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(500, { message: 'Motivo deve ter no máximo 500 caracteres.' })
  reason?: string;
}
