import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateOrganizationSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  accentColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  footerText?: string;

  @IsOptional()
  @IsString()
  termsServiceOrder?: string;

  @IsOptional()
  @IsString()
  termsQuote?: string;

  @IsOptional()
  @IsString()
  portalWelcome?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  addressNumber?: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;
}
