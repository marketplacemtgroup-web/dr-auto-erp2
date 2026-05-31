import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { QuoteStatus } from '@prisma/client';

export class UpdateQuoteDto {
  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  validUntil?: string | null;

  @IsOptional()
  @IsString()
  terms?: string;
}
