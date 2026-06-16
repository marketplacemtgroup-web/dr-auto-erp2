import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamActionLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    organizationId: string,
    data: {
      userId?: string;
      employeeId?: string;
      module: string;
      action: string;
      entity?: string;
      entityId?: string;
      description: string;
      ipAddress?: string;
      device?: string;
    },
  ) {
    return this.prisma.teamActionLog.create({
      data: {
        organizationId,
        userId: data.userId ?? null,
        employeeId: data.employeeId ?? null,
        module: data.module,
        action: data.action,
        entity: data.entity ?? null,
        entityId: data.entityId ?? null,
        description: data.description,
        ipAddress: data.ipAddress ?? null,
        device: data.device ?? null,
      },
    });
  }
}
