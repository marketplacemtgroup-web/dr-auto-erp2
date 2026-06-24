import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
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

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  paymentAgreement?: string;

  @IsOptional()
  @IsBoolean()
  freeTextEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  freeTextContent?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freeTextAmount?: number | null;
}
