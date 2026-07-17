import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  listMembers(organizationId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, email: true, name: true, avatarUrl: true, isActive: true } },
        role: true,
        branch: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
