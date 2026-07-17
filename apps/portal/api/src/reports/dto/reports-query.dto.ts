import { IsBoolean, IsDateString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReportsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  compare?: boolean;
}
