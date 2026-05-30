import { IsString, MinLength } from 'class-validator';

export class PortalLoginDto {
  @IsString()
  @MinLength(11)
  cpf!: string;

  @IsString()
  @MinLength(6)
  plate!: string;
}

