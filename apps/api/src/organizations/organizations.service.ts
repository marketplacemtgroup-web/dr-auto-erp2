import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BRANDING_BUCKET, SupabaseStorageService } from '../storage/supabase-storage.service';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { assertValidLogoFile, logoExtensionFromMime } from './organization-logo.util';

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

    const updated = await this.prisma.organization.update({
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
      include: { branches: true },
    });

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
