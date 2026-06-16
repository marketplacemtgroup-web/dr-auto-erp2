import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ACCESS_PROFILE_SLUGS } from '../default-roles';

export class CreateEmployeeAccessDto {
  @IsString()
  @MinLength(2)
  loginUsername!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsIn([...ACCESS_PROFILE_SLUGS])
  accessProfile!: string;

  @IsOptional()
  @IsBoolean()
  accessActive?: boolean;
}

export class UpdateEmployeeAccessDto {
  @IsOptional()
  @IsString()
  @IsIn([...ACCESS_PROFILE_SLUGS])
  accessProfile?: string;

  @IsOptional()
  @IsBoolean()
  accessActive?: boolean;
}

export class ResetEmployeePasswordDto {
  @IsString()
  @MinLength(6)
  password!: string;
}
