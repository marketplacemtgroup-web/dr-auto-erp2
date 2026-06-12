import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateJobTitleDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isTechnical?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
