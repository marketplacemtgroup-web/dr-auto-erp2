import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ensureDefaultRoles } from '../team/default-roles';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  syncDefaultRoles(organizationId: string) {
    return ensureDefaultRoles(this.prisma, organizationId);
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
