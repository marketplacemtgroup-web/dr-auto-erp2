import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobTitleDto } from './dto/create-job-title.dto';
import { ensureDefaultJobTitles } from './default-job-titles';

@Injectable()
export class JobTitlesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string) {
    await ensureDefaultJobTitles(this.prisma, organizationId);
    return this.prisma.jobTitle.findMany({
      where: { organizationId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(organizationId: string, dto: CreateJobTitleDto) {
    const existing = await this.prisma.jobTitle.findFirst({
      where: { organizationId, name: dto.name.trim() },
    });
    if (existing) throw new ConflictException('Cargo já existe');

    return this.prisma.jobTitle.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        description: dto.description ?? null,
        isTechnical: dto.isTechnical ?? false,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(organizationId: string, id: string, dto: Partial<CreateJobTitleDto>) {
    const row = await this.prisma.jobTitle.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Cargo não encontrado');

    return this.prisma.jobTitle.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description || null } : {}),
        ...(dto.isTechnical !== undefined ? { isTechnical: dto.isTechnical } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }
}
