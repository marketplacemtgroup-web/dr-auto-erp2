import { Injectable, Logger } from '@nestjs/common';
import {
  ensureSystemPermissions,
  syncAdminRolePermissions,
} from '@autocore/database';
import { PrismaService } from '../prisma/prisma.service';
import { ensureDefaultRoles } from '../team/default-roles';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncSystemPermissions() {
    await ensureSystemPermissions(this.prisma);
    await syncAdminRolePermissions(this.prisma);
  }

  syncDefaultRoles(organizationId: string) {
    return ensureDefaultRoles(this.prisma, organizationId);
  }

  /** Sincroniza perfis padrão (mecânico, recepção, etc.) em todas as organizações. */
  async syncAllDefaultRoles() {
    await this.syncSystemPermissions();

    const organizations = await this.prisma.organization.findMany({
      select: { id: true, name: true },
    });

    for (const org of organizations) {
      await ensureDefaultRoles(this.prisma, org.id);
      this.logger.log(`Perfis padrão sincronizados: ${org.name}`);
    }

    return { organizations: organizations.length };
  }

  listRoles(organizationId: string) {
    return this.prisma.role.findMany({
      where: { organizationId },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { name: 'asc' }] });
  }
}
