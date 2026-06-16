import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BRANDING_BUCKET, SupabaseStorageService } from '../storage/supabase-storage.service';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { assertValidLogoFile, logoExtensionFromMime } from './organization-logo.util';
import { formatAddressLine } from '../common/address.util';

const ADDRESS_FIELDS = [
  'zipCode',
  'street',
  'addressNumber',
  'complement',
  'district',
  'city',
  'state',
] as const;

type AddressField = (typeof ADDRESS_FIELDS)[number];

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: SupabaseStorageService,
  ) {}

  async getOrganization(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { branches: true },
    });
    if (!org) throw new NotFoundException('Organização não encontrada');
    return org;
  }

  async listBranches(organizationId: string) {
    return this.prisma.branch.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async updateSettings(
    organizationId: string,
    userId: string,
    dto: UpdateOrganizationSettingsDto,
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organização não encontrada');

    const hasAddressUpdate = ADDRESS_FIELDS.some((field) => dto[field] !== undefined);

    await this.prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.tradeName !== undefined ? { tradeName: dto.tradeName || null } : {}),
          ...(dto.document !== undefined
            ? { document: dto.document.replace(/\D/g, '') || null }
            : {}),
          ...(dto.email !== undefined ? { email: dto.email || null } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
          ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl || null } : {}),
          ...(dto.primaryColor !== undefined ? { primaryColor: dto.primaryColor } : {}),
          ...(dto.accentColor !== undefined ? { accentColor: dto.accentColor } : {}),
          ...(dto.footerText !== undefined ? { footerText: dto.footerText || null } : {}),
          ...(dto.termsServiceOrder !== undefined
            ? { termsServiceOrder: dto.termsServiceOrder || null }
            : {}),
          ...(dto.termsQuote !== undefined ? { termsQuote: dto.termsQuote || null } : {}),
          ...(dto.portalWelcome !== undefined ? { portalWelcome: dto.portalWelcome || null } : {}),
        },
      });

      if (hasAddressUpdate) {
        const mainBranch = await tx.branch.findFirst({
          where: { organizationId, isMain: true },
        });
        if (!mainBranch) throw new NotFoundException('Filial matriz não encontrada');

        const next = ADDRESS_FIELDS.reduce(
          (acc, field) => {
            if (dto[field] !== undefined) {
              acc[field] = dto[field]?.trim() || null;
            }
            return acc;
          },
          {} as Partial<Record<AddressField, string | null>>,
        );

        const merged = {
          zipCode: next.zipCode !== undefined ? next.zipCode : mainBranch.zipCode,
          street: next.street !== undefined ? next.street : mainBranch.street,
          addressNumber:
            next.addressNumber !== undefined ? next.addressNumber : mainBranch.addressNumber,
          complement: next.complement !== undefined ? next.complement : mainBranch.complement,
          district: next.district !== undefined ? next.district : mainBranch.district,
          city: next.city !== undefined ? next.city : mainBranch.city,
          state: next.state !== undefined ? next.state : mainBranch.state,
        };

        await tx.branch.update({
          where: { id: mainBranch.id },
          data: {
            ...merged,
            address: formatAddressLine(merged) || null,
          },
        });
      }
    });

    const updated = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { branches: true },
    });
    if (!updated) throw new NotFoundException('Organização não encontrada');

    await this.audit.log(organizationId, 'settings.update', 'organization', {
      userId,
      metadata: { fields: Object.keys(dto) },
    });

    return updated;
  }

  async getPublicBranding() {
    const org = await this.prisma.organization.findFirst({
      orderBy: { createdAt: 'asc' },
      select: {
        name: true,
        tradeName: true,
        logoUrl: true,
        primaryColor: true,
        accentColor: true,
      },
    });
    if (!org) {
      return {
        name: null,
        tradeName: null,
        logoUrl: null,
        primaryColor: '#0E7490',
        accentColor: '#0F3D4C',
      };
    }
    return {
      name: org.name,
      tradeName: org.tradeName,
      logoUrl: org.logoUrl,
      primaryColor: org.primaryColor,
      accentColor: org.accentColor,
    };
  }

  async uploadLogo(
    organizationId: string,
    file: Express.Multer.File,
    userId?: string,
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organização não encontrada');

    assertValidLogoFile(file);
    const ext = logoExtensionFromMime(file.mimetype);
    const storagePath = `organizations/${organizationId}/logo.${ext}`;

    await this.storage.upload(
      BRANDING_BUCKET,
      storagePath,
      file.buffer,
      file.mimetype,
      true,
    );

    const logoUrl = this.storage.publicObjectUrl(BRANDING_BUCKET, storagePath);
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { logoUrl },
      include: { branches: true },
    });

    if (userId) {
      await this.audit.log(organizationId, 'settings.update', 'organization', {
        userId,
        metadata: { fields: ['logoUrl'] },
      });
    }

    return updated;
  }

  async getAdminStats(organizationId: string) {
    const [activeUsers, branches, pendingInvites, recentAccess] = await Promise.all([
      this.prisma.organizationMember.count({
        where: { organizationId, isActive: true },
      }),
      this.prisma.branch.count({ where: { organizationId } }),
      this.prisma.organizationMember.count({
        where: { organizationId, isActive: false },
      }),
      this.prisma.auditLog.findMany({
        where: { organizationId, action: 'login' },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      activeUsers,
      branches,
      pendingPermissions: pendingInvites,
      recentAccess,
    };
  }
}
