import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLoanDto {
  @IsString()
  @MinLength(2)
  bankName!: string;

  @IsOptional()
  @IsString()
  contractNumber?: string;

  @IsNumber()
  @Min(0.01)
  principalAmount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  interestRate?: number;

  @IsInt()
  @Min(1)
  installments!: number;

  @IsNumber()
  @Min(0.01)
  installmentAmount!: number;

  @IsDateString()
  firstDueDate!: string;

  @IsString()
  destinationAccountId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
