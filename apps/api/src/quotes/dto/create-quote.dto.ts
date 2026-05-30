import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateQuoteDto {
  @IsString()
  serviceOrderId!: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
}
