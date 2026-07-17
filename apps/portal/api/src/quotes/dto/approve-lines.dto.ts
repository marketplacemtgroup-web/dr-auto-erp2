import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class LineApprovalDto {
  @IsString()
  lineId!: string;

  @IsBoolean()
  approved!: boolean;
}

export class ApproveLinesDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineApprovalDto)
  lines?: LineApprovalDto[];

  @IsOptional()
  @IsString()
  comment?: string;
}
