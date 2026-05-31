import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ChecklistResult } from '@prisma/client';

class ChecklistItemDto {
  @IsString()
  id!: string;

  @IsOptional()
  @IsEnum(ChecklistResult)
  result?: ChecklistResult | null;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateChecklistDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  items!: ChecklistItemDto[];
}
