import { IsDateString, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class ReverseFinancialEntryDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
