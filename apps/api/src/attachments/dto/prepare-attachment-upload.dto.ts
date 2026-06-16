import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class PrepareAttachmentUploadDto {
  @IsString()
  @MaxLength(200)
  fileName!: string;

  @IsString()
  @MaxLength(120)
  mimeType!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  visibleToCustomer?: boolean;

  @IsOptional()
  @IsBoolean()
  showOnQuote?: boolean;
}

export class ConfirmAttachmentUploadDto extends PrepareAttachmentUploadDto {
  @IsString()
  @MaxLength(500)
  storagePath!: string;
}
