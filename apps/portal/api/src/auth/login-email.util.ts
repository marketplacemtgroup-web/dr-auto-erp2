import { BadRequestException } from '@nestjs/common';

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$|^[a-z0-9]{1,2}$/;
const DOMAIN_RE =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export function normalizeLoginUsername(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '.');
}

export function normalizeLoginEmailDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^@+/, '');
}

export function suggestLoginEmailDomain(organizationName: string): string {
  const base = organizationName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 30);
  return base ? `${base}.local` : 'oficina.local';
}

export function buildLoginEmail(username: string, domain: string): string {
  const normalizedUsername = normalizeLoginUsername(username);
  const normalizedDomain = normalizeLoginEmailDomain(domain);

  if (!normalizedUsername || normalizedUsername.length < 2) {
    throw new BadRequestException('Usuário de login inválido (mínimo 2 caracteres)');
  }
  if (!USERNAME_RE.test(normalizedUsername)) {
    throw new BadRequestException(
      'Usuário de login inválido. Use letras, números, ponto, hífen ou sublinhado',
    );
  }
  if (!normalizedDomain || !DOMAIN_RE.test(normalizedDomain)) {
    throw new BadRequestException('Domínio de login inválido');
  }

  return `${normalizedUsername}@${normalizedDomain}`;
}

export function extractLoginEmailDomain(email: string): string | null {
  const at = email.indexOf('@');
  if (at <= 0 || at >= email.length - 1) return null;
  return normalizeLoginEmailDomain(email.slice(at + 1));
}
