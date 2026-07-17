import { IsNumber, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';

export class CreateFixedExpenseDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color deve ser um hex #RRGGBB' })
  color?: string;
}

export class UpdateFixedExpenseDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color deve ser um hex #RRGGBB' })
  color?: string;
}
