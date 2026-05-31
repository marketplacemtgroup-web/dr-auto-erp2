import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CAR_CHECKLIST_TEMPLATE } from '../service-orders/checklist-template';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

const appointmentInclude = {
  vehicle: { include: { customer: true } },
  mechanic: { include: { user: true } },
  serviceOrder: { select: { id: true, number: true, status: true } },
};

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  create(organizationId: string, dto: CreateAppointmentDto) {
    return this.prisma.appointment.create({
      data: {
        organizationId,
        vehicleId: dto.vehicleId,
        mechanicMemberId: dto.mechanicMemberId ?? null,
        scheduledAt: new Date(dto.scheduledAt),
        durationMinutes: dto.durationMinutes ?? 60,
        status: dto.status ?? 'SCHEDULED',
        bay: dto.bay ?? null,
        notes: dto.notes ?? null,
      },
      include: appointmentInclude,
    });
  }

  list(organizationId: string, from?: string, to?: string, status?: string) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    return this.prisma.appointment.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as never } : {}),
        ...(fromDate || toDate
          ? {
              scheduledAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      include: appointmentInclude,
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const row = await this.prisma.appointment.findFirst({
      where: { id, organizationId },
      include: appointmentInclude,
    });
    if (!row) throw new NotFoundException('Agendamento não encontrado');
    return row;
  }

  async update(organizationId: string, id: string, dto: UpdateAppointmentDto) {
    await this.findOne(organizationId, id);
    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...(dto.vehicleId !== undefined ? { vehicleId: dto.vehicleId } : {}),
        ...(dto.mechanicMemberId !== undefined
          ? { mechanicMemberId: dto.mechanicMemberId || null }
          : {}),
        ...(dto.scheduledAt !== undefined ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
        ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.bay !== undefined ? { bay: dto.bay || null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
      },
      include: appointmentInclude,
    });
  }

  async remove(organizationId: string, id: string) {
    const row = await this.findOne(organizationId, id);
    if (row.serviceOrderId) {
      throw new BadRequestException('Agendamento já convertido em OS');
    }
    await this.prisma.appointment.delete({ where: { id } });
    return { ok: true };
  }

  async convertToServiceOrder(organizationId: string, id: string) {
    const appt = await this.findOne(organizationId, id);
    if (appt.serviceOrderId) {
      throw new BadRequestException('Este agendamento já possui OS vinculada');
    }

    const last = await this.prisma.serviceOrder.findFirst({
      where: { organizationId },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const number = (last?.number ?? 1000) + 1;

    const branch = await this.prisma.branch.findFirst({
      where: { organizationId, isMain: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const so = await tx.serviceOrder.create({
        data: {
          organizationId,
          vehicleId: appt.vehicleId,
          branchId: branch?.id,
          number,
          status: 'RECEIVED',
          enteredAt: appt.scheduledAt,
          estimatedAt: appt.scheduledAt,
          mechanicMemberId: appt.mechanicMemberId,
          bay: appt.bay,
          complaint: appt.notes,
          checklistItems: {
            create: CAR_CHECKLIST_TEMPLATE.map((item, idx) => ({
              organizationId,
              category: item.category,
              label: item.label,
              sortOrder: idx,
            })),
          },
          statusHistory: {
            create: {
              organizationId,
              toStatus: 'RECEIVED',
              notes: `OS aberta a partir do agendamento`,
            },
          },
        },
      });

      await tx.appointment.update({
        where: { id },
        data: {
          serviceOrderId: so.id,
          status: 'IN_PROGRESS',
        },
      });

      return tx.appointment.findFirst({
        where: { id },
        include: appointmentInclude,
      });
    });
  }
}
