import { IsString, MaxLength, MinLength } from 'class-validator';

export class DeleteFinancialEntryDto {
  @IsString()
  @MinLength(3, { message: 'Informe o motivo da exclusão (mínimo 3 caracteres)' })
  @MaxLength(1000)
  reason!: string;
}
