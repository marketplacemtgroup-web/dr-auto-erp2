import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EmployeeStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListEmployeesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsString()
  jobTitleId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
