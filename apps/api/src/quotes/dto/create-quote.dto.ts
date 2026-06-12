import { IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class CreateQuoteDto {
  @ValidateIf((o: CreateQuoteDto) => !o.vehicleId)
  @IsString()
  serviceOrderId?: string;

  @ValidateIf((o: CreateQuoteDto) => !o.serviceOrderId)
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  complaint?: string;

  @IsOptional()
  @IsString()
  status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
}
