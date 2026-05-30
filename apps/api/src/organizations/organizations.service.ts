import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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
