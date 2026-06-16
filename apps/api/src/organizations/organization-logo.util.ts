import { BadRequestException } from '@nestjs/common';

const ALLOWED_LOGO_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export function assertValidLogoFile(file: Express.Multer.File) {
  if (!ALLOWED_LOGO_MIME.has(file.mimetype)) {
    throw new BadRequestException(
      'Logo inválido. Use PNG, JPEG, JPG ou WebP.',
    );
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new BadRequestException('Logo muito grande. Máximo 5 MB.');
  }
}

export function logoExtensionFromMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}
