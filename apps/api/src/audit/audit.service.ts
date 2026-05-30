import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(
    organizationId: string,
    action: string,
    resource: string,
    options?: {
      userId?: string;
      metadata?: Prisma.InputJsonValue;
      ipAddress?: string;
    },
  ) {
    return this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: options?.userId ?? null,
        action,
        resource,
        metadata: options?.metadata ?? undefined,
        ipAddress: options?.ipAddress ?? null,
      },
    });
  }

  list(
    organizationId: string,
    options?: { search?: string; resource?: string; limit?: number },
  ) {
    const limit = Math.min(options?.limit ?? 50, 200);
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        ...(options?.resource ? { resource: options.resource } : {}),
        ...(options?.search
          ? {
              OR: [
                { action: { contains: options.search, mode: 'insensitive' } },
                { resource: { contains: options.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
